package com.peuzon.modules

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.peuzon.providers.deviceUUID

class DeviceModule(private val rctx: ReactApplicationContext) : ReactContextBaseJavaModule(rctx) {

  override fun getName() = "Device"

  override fun initialize() {
    Log.i(TAG, "initialized")
  }

  @ReactMethod
  fun getUUID(promise: Promise) {
    try {
      promise.resolve(rctx.deviceUUID)
    } catch (e: Exception) {
      promise.reject("DEVICE_UUID", e)
    }
  }

  companion object {
    private const val TAG = "RNDeviceModule"
  }
}
