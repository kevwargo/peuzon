package com.peuzon.modules

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.peuzon.providers.deviceUUID

class DeviceModule(private val rctx: ReactApplicationContext) : BaseModule(rctx, "Device") {

  @ReactMethod
  fun getUUID(promise: Promise) {
    try {
      promise.resolve(rctx.deviceUUID)
    } catch (e: Exception) {
      promise.reject("DEVICE_UUID", e)
    }
  }
}
