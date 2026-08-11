package com.peuzon.providers

import android.content.Context
import android.provider.Settings
import java.security.MessageDigest
import java.util.UUID

object DeviceUUIDProvider {

  @Volatile private var cached: String? = null

  fun retrieve(ctx: Context): String {
    return cached
        ?: synchronized(this) {
          cached ?: buildDeviceIdHash(ctx).also { cached = it }
        }
  }

  private fun buildDeviceIdHash(ctx: Context): String =
      Settings.Secure.getString(ctx.applicationContext.contentResolver, Settings.Secure.ANDROID_ID)
          .let { MessageDigest.getInstance("SHA-256").digest(it.encodeToByteArray()) }
          .let { UUID.nameUUIDFromBytes(it).toString() }
}

/**
 * Extension property available on any Context.
 *
 * Usage: val id = context.deviceUUID
 */
val Context.deviceUUID: String
  get() = DeviceUUIDProvider.retrieve(this)
