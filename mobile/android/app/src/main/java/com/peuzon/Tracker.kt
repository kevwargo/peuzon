package com.peuzon

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.Manifest
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Process
import android.provider.Settings
import android.util.Log
import androidx.core.app.ServiceCompat
import androidx.core.content.PermissionChecker
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.Granularity
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.text.SimpleDateFormat
import java.util.Date
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request

class Tracker : Service() {

    companion object {
        private const val TAG = "TrackingService"
        private const val CHANNEL_ID = "tracking"
        private const val NOTIFICATION_ID = 1
    }

    private val client = OkHttpClient()
    private val dtFmt = SimpleDateFormat("yyyyMMdd-HHmmss.SSS")
    private val utf8Enc = StandardCharsets.UTF_8.name()

    private lateinit var fusedClient: FusedLocationProviderClient

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            for (loc in result.locations) {
                val msg = "lat=${loc.latitude} lon=${loc.longitude} acc=${loc.accuracy}"
                Log.i(TAG, msg)
                logHttp(msg)
            }
        }
    }

    private val handler = Handler(Looper.getMainLooper())

    private val heartbeat = object : Runnable {
        override fun run() {
            val msg = "heartbeat: pid=${Process.myPid()} thread=${Thread.currentThread().name}"
            Log.i(TAG, msg)
            logHttp(msg)
            handler.postDelayed(this, 30_000)
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "onCreate")

        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        Log.i(TAG, "onCreate fusedClient $fusedClient")

        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "onStartCommand startId=$startId")

        handler.removeCallbacks(heartbeat)
        handler.post(heartbeat)

        val allowed = PermissionChecker.checkSelfPermission(
            this, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PermissionChecker.PERMISSION_GRANTED
        if (!allowed) {
            Log.w(TAG, "Location permission missing")
            stopSelf()
            return START_NOT_STICKY
        } else {
            Log.i(TAG, "Location watch allowed, calling startForeground()")
        }

        ServiceCompat.startForeground(
            this,
            NOTIFICATION_ID,
            buildNotification(),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
        )
        startLocationUpdates()

        return START_STICKY
    }

    override fun onDestroy() {
        Log.i(TAG, "onDestroy")
        handler.removeCallbacks(heartbeat)
        fusedClient.removeLocationUpdates(locationCallback)

        super.onDestroy()
    }

    override fun onTaskRemoved(intent: Intent) {
        Log.i(TAG, "onTaskRemove")
        super.onTaskRemoved(intent)
    }

    override fun onTimeout(startId: Int, fgsType: Int) {
        Log.i(TAG, "onTimeout($startId, $fgsType)")
        super.onTimeout(startId, fgsType)
    }

    override fun onTimeout(startId: Int) {
        Log.i(TAG, "onTimeout($startId)")
        super.onTimeout(startId)
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun logHttp(msg: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val timestamp = URLEncoder.encode(dtFmt.format(Date()), utf8Enc)
                val deviceId = URLEncoder.encode(
                    Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID),
                    utf8Enc
                )
                val url = "http://192.168.1.220:8181/$deviceId/$timestamp"

                val request = Request.Builder().url(url).get().build()

                client.newCall(request).execute().use { response ->
                    if (response.code > 399) {
                        Log.w(TAG, "log api HTTP ${response.code}")
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "log api exception $e")
            }
        }
    }

    private fun startLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000L)
            .setGranularity(Granularity.GRANULARITY_FINE)
            .setMinUpdateDistanceMeters(5.0f)
            .build()

        fusedClient.requestLocationUpdates(
            request,
            locationCallback,
            mainLooper
        )
    }

    private fun buildNotification(): Notification {
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Tracking active")
            .setContentText("Receiving GPS updates")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val channel = NotificationChannel(
            CHANNEL_ID,
            "Location tracking",
            NotificationManager.IMPORTANCE_LOW
        )

        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(channel)
    }
}
