package com.peuzon.modules

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.peuzon.providers.deviceUUID

class DeviceModule(private val rctx: ReactApplicationContext) : ReactContextBaseJavaModule(rctx) {

  override fun getName() = "Device"

  @ReactMethod
  fun getUUID(promise: Promise) {
    try {
      promise.resolve(rctx.deviceUUID)
    } catch (e: Exception) {
      promise.reject("DEVICE_UUID", e)
    }
  }
}
