package com.peuzon

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.peuzon.modules.Package

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
        context = applicationContext,
        packageList =
            PackageList(this).packages.apply {
              add(Package())
            },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
