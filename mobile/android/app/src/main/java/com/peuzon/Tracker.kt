package com.peuzon

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.Process
import android.provider.Settings
import android.util.Log
import androidx.core.app.ServiceCompat
import androidx.core.content.PermissionChecker
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.Granularity
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.Collections

class Tracker : Service() {

    companion object {
        private const val TAG = "TrackerService"

        private const val CHANNEL_ID = "gps_tracking"
        private const val NOTIFICATION_ID = 1

        private const val LOCATION_INTERVAL_MS = 10_000L
        private const val FLUSH_INTERVAL_MS = 10_000L
        private const val MAX_BATCH_SIZE = 100
        private const val MAX_BUF_SIZE = 1000

        private const val EVENT_LATEST_LOCATION = "LatestLocation"
    }

    private lateinit var fusedClient: FusedLocationProviderClient
    private var wakeLock: PowerManager.WakeLock? = null
    private lateinit var endpoint: String
    private val utf8Enc = StandardCharsets.UTF_8.name()
    private val httpClient = OkHttpClient()
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val pendingLocations = Collections.synchronizedList(mutableListOf<Location>())
    @Volatile
    private var latestLocation: Location? = null

    @Volatile
    private var reactContext: ReactApplicationContext? = null

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            Log.i(TAG, "callback locations=${result.locations.size}")
            for (loc in result.locations) {
                pendingLocations.add(loc)
                Log.i(TAG, "loc lat=${loc.latitude} lon=${loc.longitude}")
            }

            if (pendingLocations.size > MAX_BUF_SIZE) {
                val oldSize = pendingLocations.size
                pendingLocations.subList(0, pendingLocations.size - MAX_BUF_SIZE).clear()
                Log.i(TAG, "trimmed pending locations buffer from ${oldSize} to ${pendingLocations.size}")
            }
            
            if (pendingLocations.size >= MAX_BATCH_SIZE) {
                serviceScope.launch {
                    flushLocations()
                }
            }

            latestLocation = result.locations[result.locations.size - 1]
            emitLatestLocation()
        }
    }

    inner class LocalBinder : Binder() {
        fun getService(): Tracker = this@Tracker
    }

    private val binder = LocalBinder()

    override fun onCreate() {
        super.onCreate()

        Log.i(TAG, "onCreate(${this})")

        val apiUrl = getString(R.string.api_url)
        val deviceId = URLEncoder.encode(
            Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID),
            utf8Enc
        )
        endpoint = "$apiUrl/sessions/$deviceId/locations"

        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()

    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "onStartCommand(${this})")

        if (wakeLock == null) {
            val pm = getSystemService(PowerManager::class.java)
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "${packageName}:tracker")
            wakeLock?.acquire()
        }

        val hasPermission = PermissionChecker.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PermissionChecker.PERMISSION_GRANTED

        if (!hasPermission) {
            Log.w(TAG, "Location permission missing")
            stopSelf()
            return START_NOT_STICKY
        }

        ServiceCompat.startForeground(
            this,
            NOTIFICATION_ID,
            buildNotification(),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
        )

        startLocationUpdates()
        startPeriodicUploader()

        return START_STICKY
    }

    override fun onDestroy() {
        Log.i(TAG, "onDestroy(${this})")

        wakeLock?.release()
        fusedClient.removeLocationUpdates(locationCallback)
        serviceScope.cancel()

        super.onDestroy()
    }

    override fun onBind(intent: Intent): IBinder {
        Log.i(TAG, "${this}.onBind($intent)")
        return binder
    }

    fun attachReactContext(rctx: ReactApplicationContext) {
        reactContext = rctx
        Log.i(TAG, "attached react context $rctx")
        emitLatestLocation()
    }

    private fun emitLatestLocation() {
        val rctx = reactContext ?: return
        if (!rctx.hasActiveReactInstance()) {
            Log.i(TAG, "the latest rctx doesn't have active react instance");
            return
        }

        latestLocation?.let {
            Log.i(TAG, "emitting latest location $it")
            rctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_LATEST_LOCATION, Arguments.makeNativeMap(locToMap(it)))
        } ?: Log.i(TAG, "latest location not set")
    }

    private fun startLocationUpdates() {
        val request =
            LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, LOCATION_INTERVAL_MS)
                .setGranularity(Granularity.GRANULARITY_FINE)
                .build()

        Log.i(TAG, "subscribing ${locationCallback} to location updates")
        fusedClient.requestLocationUpdates(request, locationCallback, mainLooper)
    }

    private fun startPeriodicUploader() {
        serviceScope.launch {
            Log.i(TAG, "starting flushLocations() loop")
            while (true) {
                delay(FLUSH_INTERVAL_MS)
                flushLocations()
            }
        }
    }

    private fun locToMap(loc: Location) = mapOf(
        "pid" to Process.myPid(),
        "tid" to Process.myTid(),
        "ts" to loc.time,
        "lat" to loc.latitude,
        "lng" to loc.longitude,
        "acc" to loc.accuracy,
        "alt" to loc.altitude,
        "speed" to loc.speed,
        "bearing" to loc.bearing,
    )

    private fun locToJSON(loc: Location) = JSONObject().apply {
        for ((k, v) in locToMap(loc)) {
            put(k, v)
        }
    }

    private fun flushLocations() {
        val batch: List<Location>
        synchronized(pendingLocations) {
            if (pendingLocations.isEmpty()) {
                Log.i(TAG, "skipping empty locations list flush")
                return
            }
            Log.i(TAG, "flushing ${pendingLocations.size} locations")
            batch = pendingLocations.toList()
            pendingLocations.clear()
        }

        try {
            val body = JSONArray().apply {
                for (loc in batch) {
                    put(locToJSON(loc))
                }
            }.toString().toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url(endpoint)
                .header("Authorization", getString(R.string.api_key))
                .post(body)
                .build()

            httpClient.newCall(request).execute().use { resp ->
                if (!resp.isSuccessful) {
                    Log.w(TAG, "upload failed: [${resp.code}] ${resp.body?.string()}")
                } else {
                    Log.i(TAG, "uploaded ${batch.size} locations")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "upload exception", e)
            pendingLocations.addAll(batch)
        }
    }

    private fun buildNotification(): Notification {
        val packageInfo = if (Build.VERSION.SDK_INT >= 33) {
            packageManager.getPackageInfo(packageName, 0)
        } else {
            @Suppress("DEPRECATION")
            packageManager.getPackageInfo(packageName, 0)
        }

        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("GPS Tracking")
            .setContentText("Tracking and sending realtime location (${packageInfo.versionName})")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val channel =
            NotificationChannel(CHANNEL_ID, "GPS Tracking", NotificationManager.IMPORTANCE_LOW)
        getSystemService(NotificationManager::class.java)
            .createNotificationChannel(channel)
    }
}
