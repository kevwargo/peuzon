package com.peuzon.modules

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod

class ControllerModule(private val rctx: ReactApplicationContext) : BaseModule(rctx, "Controller") {

  @ReactMethod
  fun closeUI(promise: Promise) {
    rctx.currentActivity?.runOnUiThread {
      Log.i(TAG, "Closing current activity ${rctx.currentActivity}")

      try {
        rctx.currentActivity?.finish()
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("EXIT_ACTIVITY", e)
      }
    }
  }
}
