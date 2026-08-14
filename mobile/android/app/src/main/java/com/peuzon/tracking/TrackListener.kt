package com.peuzon.tracking

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class TrackListener(private val rctx: ReactApplicationContext) {
  companion object {
    private const val TAG = "TrackListener"
  }

  fun onStateChanged(started: Boolean) {
    emitEvent("TRACKER_STATE_CHANGED", started)
  }

  fun onNewLocation(ev: LocationEvent) {
    emitEvent("TRACKER_NEW_LOCATION", Arguments.makeNativeMap(ev.toMap()))
  }

  private fun emitEvent(name: String, params: Any?) {
    if (!rctx.hasActiveReactInstance()) {
      Log.w(TAG, "Skipped emit(${name}) - no active react instance")
    } else {
      rctx
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit(name, params)
    }
  }
}
