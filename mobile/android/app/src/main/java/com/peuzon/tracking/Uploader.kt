package com.peuzon.tracking

import android.location.Location
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class Uploader(private val locationChannel: Channel<Location>) {
  companion object {
    private const val TAG = "LocationsUploader"

    private const val FLUSH_INTERVAL_MS = 10_000L
    private const val MAX_BATCH_SIZE = 100
  }

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private val httpClient = OkHttpClient()

  fun start(endpoint: String, apiKey: String) {
    scope.launch {
      Log.i(TAG, "starting flushLocations() loop")
      while (true) {
        val batch = mutableListOf<Location>()

        val closed =
            withTimeoutOrNull(FLUSH_INTERVAL_MS) {
              while (batch.size < MAX_BATCH_SIZE) {
                locationChannel.receiveCatching().apply {
                  if (isClosed) return@withTimeoutOrNull true
                  batch.add(getOrThrow())
                }
              }

              false
            } ?: false

        if (closed) {
          Log.w(TAG, "location channel closed on receive()")
          break
        }

        uploadBatch(batch, endpoint, apiKey)
      }
    }
  }

  fun stop() {
    scope.cancel()
  }

  private fun uploadBatch(batch: List<Location>, endpoint: String, apiKey: String) {
    try {
      val body = batch.toJSON().toString().toRequestBody("application/json".toMediaType())
      val request =
          Request.Builder().url(endpoint).header("Authorization", apiKey).post(body).build()

      httpClient.newCall(request).execute().use { resp ->
        if (!resp.isSuccessful) {
          Log.w(TAG, "upload failed: [${resp.code}] ${resp.body?.string()}")
        } else {
          Log.i(TAG, "uploaded ${batch.size} locations")
        }
      }
    } catch (e: Exception) {
      Log.w(TAG, "upload exception", e)
    }
  }
}
