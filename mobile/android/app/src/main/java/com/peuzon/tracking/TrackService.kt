package com.peuzon.tracking

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
import android.util.Log
import androidx.core.app.ServiceCompat
import androidx.core.content.PermissionChecker
import com.peuzon.R
import com.peuzon.providers.deviceUUID
import kotlinx.coroutines.channels.Channel

class TrackService : Service() {

  companion object {
    private const val TAG = "TrackService"

    private const val CHANNEL_ID = "gps_tracking"
    private const val NOTIFICATION_ID = 1

    private const val LOCATION_INTERVAL_MS = 10_000L
    private const val MAX_BUF_SIZE = 1000

    private const val EVENT_LATEST_LOCATION = "LatestLocation"
  }

  private val locationChannel = Channel<Location>()
  private val locationWatcher = LocationWatcher(locationChannel)
  private val locationUploader = Uploader(locationChannel)

  override fun onCreate() {
    super.onCreate()

    Log.i(TAG, "onCreate(${this}), deviceId: ${deviceUUID}")

    createNotificationChannel()
  }

  override fun onBind(intent: Intent): IBinder {
    Log.i(TAG, "${this}.onBind(${intent})")
    return binder
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Log.i(TAG, "onStartCommand(${this})")

    val hasPermission =
        PermissionChecker.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION,
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
        ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
    )

    locationWatcher.start(this)
    locationUploader.start(
        "${getString(R.string.api_url)}/devices/${deviceUUID}/locations",
        getString(R.string.api_key),
    )

    isStarted = true

    return START_STICKY
  }

  override fun onDestroy() {
    Log.i(TAG, "${this}.onDestroy()")

    locationWatcher.stop()
    locationUploader.stop()

    isStarted = false

    super.onDestroy()
  }

  @Volatile
  var isStarted = false
    private set

  private fun buildNotification(): Notification {
    val pkgInfo =
        if (Build.VERSION.SDK_INT >= 33) {
          packageManager.getPackageInfo(packageName, 0)
        } else {
          @Suppress("DEPRECATION") packageManager.getPackageInfo(packageName, 0)
        }

    return Notification.Builder(this, CHANNEL_ID)
        .setContentTitle("GPS Tracking")
        .setContentText("Tracking and sending realtime location (${pkgInfo.versionName})")
        .setSmallIcon(android.R.drawable.ic_menu_mylocation)
        .build()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val channel =
        NotificationChannel(CHANNEL_ID, "GPS Tracking", NotificationManager.IMPORTANCE_LOW)
    getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
  }

  inner class LocalBinder : Binder() {
    fun getService(): TrackService = this@TrackService
  }

  private val binder = LocalBinder()
}
