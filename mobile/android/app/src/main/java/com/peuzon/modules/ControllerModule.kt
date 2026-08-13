package com.peuzon.modules

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod

class ControllerModule(private val rctx: ReactApplicationContext) : BaseModule(rctx, "Controller") {

  @ReactMethod
  fun closeUI() {
    rctx.currentActivity?.runOnUiThread {
      Log.i(TAG, "Closing current activity ${rctx.currentActivity}")
      rctx.currentActivity?.finish()
    }
  }
}
