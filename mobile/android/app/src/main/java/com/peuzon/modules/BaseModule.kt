package com.peuzon.modules

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

abstract class BaseModule(
    private val rctx: ReactApplicationContext,
    private val name: String,
) : ReactContextBaseJavaModule(rctx) {

  override fun getName() = name

  override fun initialize() {
    Log.i(TAG, "initialized")
  }

  protected val TAG = "RN${name}Module"
}
