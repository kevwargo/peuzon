package com.peuzon.modules

import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod

class BatteryModule(private val rctx: ReactApplicationContext) : BaseModule(rctx, "Battery") {

  @ReactMethod
  fun isThrottled(promise: Promise) {
    try {
      val pm = rctx.getSystemService(PowerManager::class.java)
      promise.resolve(!pm.isIgnoringBatteryOptimizations(rctx.packageName))
    } catch (e: Exception) {
      promise.reject("CHECK_BATEXEMPT_FAILED", e)
    }
  }

  @ReactMethod
  fun requestExemption(promise: Promise) {
    try {
      val intent =
          Intent(
              Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
              Uri.parse("package:${rctx.packageName}"),
          )
      val act = rctx.currentActivity!!
      act.startActivity(intent)

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("REQUEST_BATEXEMPT_FAILED", e)
    }
  }
}
