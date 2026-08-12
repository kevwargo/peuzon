package com.peuzon.modules

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class Package : ReactPackage {
  @Deprecated("ReactPackage legacy API")
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(TrackModule(reactContext), DeviceModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
