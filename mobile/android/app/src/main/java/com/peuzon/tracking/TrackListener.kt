package com.peuzon.tracking

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class TrackListener(private val rctx: ReactApplicationContext) {
  fun onStateChanged(started: Boolean) {
    emitEvent("TRACKER_STATE_CHANGED", started)
  }

  fun onNewLocation(ev: LocationEvent) {
    emitEvent("TRACKER_NEW_LOCATION", Arguments.makeNativeMap(ev.toMap()))
  }

  private fun emitEvent(name: String, params: Any?) {
    rctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(name, params)
  }
}
