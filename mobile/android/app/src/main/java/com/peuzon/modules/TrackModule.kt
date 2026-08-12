package com.peuzon.modules

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import androidx.core.content.PermissionChecker
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.peuzon.services.Tracker

class TrackModule(private val rctx: ReactApplicationContext) : ReactContextBaseJavaModule(rctx) {

  override fun getName() = "LocTrack"

  override fun initialize() {
    val intent = Intent(rctx, Tracker::class.java)
    val bound = rctx.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
    Log.i(TAG, "bound in initialize() = $bound")
  }

  override fun invalidate() {
    Log.i(TAG, "invalidate(), unbinding $trackerService")
    rctx.unbindService(serviceConnection)
  }

  @ReactMethod
  fun startTracking(promise: Promise) {
    try {
      val allowed =
          PermissionChecker.checkSelfPermission(
              rctx,
              Manifest.permission.ACCESS_FINE_LOCATION,
          ) == PermissionChecker.PERMISSION_GRANTED
      if (!allowed) {
        Log.w(TAG, "Location permission missing")
        promise.reject("TRACK_DENIED", "Location permission missing")
        return
      }

      Log.i(TAG, "Location watch allowed, calling startForeground()")

      val intent = Intent(rctx, Tracker::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        rctx.startForegroundService(intent)
      } else {
        rctx.startService(intent)
      }

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("TRACK_START_FAILED", e)
    }
  }

  @ReactMethod
  fun stopTracking(promise: Promise) {
    try {
      Log.i(TAG, "unbinding $trackerService in @React stopTracking()")
      rctx.unbindService(serviceConnection)
      val intent = Intent(rctx, Tracker::class.java)
      val stopped = rctx.stopService(intent)
      Log.i(TAG, "tracker service stopped($stopped) and unbound")
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("TRACK_STOP_FAILED", e)
    }
  }

  @ReactMethod
  fun isBatteryThrottled(promise: Promise) {
    try {
      val pm = rctx.getSystemService(PowerManager::class.java)
      promise.resolve(!pm.isIgnoringBatteryOptimizations(rctx.packageName))
    } catch (e: Exception) {
      promise.reject("CHECK_BATEXEMPT_FAILED", e)
    }
  }

  @ReactMethod
  fun requestBatteryExemption(promise: Promise) {
    try {
      val intent =
          Intent(
              Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
              Uri.parse("package:${rctx.packageName}"),
          )
      val act = rctx.currentActivity!!
      act.startActivity(intent)

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("REQUEST_BATEXEMPT_FAILED", e)
    }
  }

  companion object {
    private const val TAG = "RNTrackModule"
  }

  private var trackerService: Tracker? = null

  private val serviceConnection =
      object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName, binder: IBinder) {
          val trackerBinder = binder as? Tracker.LocalBinder ?: return

          trackerService =
              trackerBinder.getService().apply {
                Log.i(TAG, "connected to $this")
                attachReactContext(rctx)
              }
        }

        override fun onServiceDisconnected(name: ComponentName) {
          Log.i(TAG, "disconnected from $trackerService")
          trackerService = null
        }
      }
}
