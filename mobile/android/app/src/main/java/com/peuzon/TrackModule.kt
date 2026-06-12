package com.peuzon

import android.Manifest
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.content.PermissionChecker

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TrackModule(private val rctx: ReactApplicationContext) : ReactContextBaseJavaModule(rctx) {
    companion object {
        private const val TAG = "RNTrackModule"
    }

    override fun getName() = "LocTrack"

    @ReactMethod
    fun startTracking(promise: Promise) {
        try {
            val allowed = PermissionChecker.checkSelfPermission(
                rctx, Manifest.permission.ACCESS_FINE_LOCATION
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
            val intent = Intent(rctx, Tracker::class.java)
            rctx.stopService(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STOP_FAILED", e)
        }
    }
}
