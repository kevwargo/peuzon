package com.peuzon.modules

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.content.PermissionChecker
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.peuzon.tracking.TrackListener
import com.peuzon.tracking.TrackService

class TrackerModule(private val rctx: ReactApplicationContext) : BaseModule(rctx, "Tracker") {

  private var service: TrackService? = null
  private var svcBindPending = false
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun initialize() {
    bindTrackerService()
  }

  override fun invalidate() {
    Log.i(TAG, "invalidate(), unbinding ${service}")
    rctx.unbindService(serviceConnection)
    unsetService()
  }

  @ReactMethod
  fun getState(promise: Promise) {
    resolvePromiseOnMain(promise, "TRACK_STATE") {
      service?.let { svc ->
        Arguments.makeNativeMap(mapOf("started" to svc.isStarted))
      }
    }
  }

  @ReactMethod
  fun startTracking(promise: Promise) {
    try {
      if (!checkLocationPermission()) {
        promise.reject("TRACK_DENIED", "Location permission missing")
        return
      }

      Log.i(TAG, "Location watch allowed, starting foreground tracking service")
      startTrackerService()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("TRACK_START_FAILED", e)
    }
  }

  @ReactMethod
  fun stopTracking(promise: Promise) {
    resolvePromiseOnMain(promise, "TRACK_STOP_FAILED") {
      service?.stopTracking()
      null
    }
  }

  @ReactMethod
  fun addListener(eventType: String) {
    Log.i(TAG, "Added listener for ${eventType}")
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    Log.i(TAG, "Removed ${count} listeners")
  }

  private fun bindTrackerService() {
    onMain {
      if (svcBindPending || service != null) {
        Log.i(
            TAG,
            "Skipping tracker service binding request (svcBindPending:${svcBindPending} || (service != null):${service}",
        )
      } else {
        val intent = Intent(rctx, TrackService::class.java)
        val bound = rctx.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)

        Log.i(TAG, "Service binding result - ${bound}")
        svcBindPending = true
      }
    }
  }

  private fun startTrackerService() {
    bindTrackerService()

    val intent = Intent(rctx, TrackService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      rctx.startForegroundService(intent)
    } else {
      rctx.startService(intent)
    }
  }

  private fun resolvePromiseOnMain(promise: Promise, errCode: String, action: () -> Any?) {
    try {
      onMain {
        try {
          val res = action()
          promise.resolve(res)
        } catch (e: Exception) {
          promise.reject(errCode, e)
        }
      }
    } catch (e: Exception) {
      promise.reject(errCode, e)
    }
  }

  private fun unsetService() {
    onMain {
      service?.setListener(null)
      service = null
    }
  }

  private fun onMain(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      block()
    } else {
      mainHandler.post(block)
    }
  }

  private fun checkLocationPermission(): Boolean {
    val allowed =
        PermissionChecker.checkSelfPermission(
            rctx,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PermissionChecker.PERMISSION_GRANTED

    if (!allowed) {
      Log.w(TAG, "Location permission missing")
    }

    return allowed
  }

  private val serviceConnection =
      object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName, binder: IBinder) {
          Log.i(TAG, "onServiceConnected(${name}, ${binder})")

          val trackerBinder = binder as? TrackService.LocalBinder ?: return

          onMain {
            service?.setListener(null) // remove the event listener from unlikely leftover service
            service = trackerBinder.getService()
            service?.setListener(TrackListener(rctx))
            svcBindPending = false

            Log.i(TAG, "connected to ${service}")
          }
        }

        override fun onServiceDisconnected(name: ComponentName) {
          Log.i(TAG, "disconnected from ${name}, service was ${service}")
          unsetService()
        }
      }
}
