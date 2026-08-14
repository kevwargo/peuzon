package com.peuzon.tracking

import android.location.Location
import android.util.Log
import kotlin.coroutines.cancellation.CancellationException
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
    private const val FLUSH_INTERVAL_MS = 10_000L
    private const val MAX_BATCH_SIZE = 100

    private const val TAG = "LocationsUploader"
  }

  private var scope: CoroutineScope? = null
  private val httpClient = OkHttpClient()

  fun start(endpoint: String, apiKey: String) {
    Log.i(TAG, "start(${endpoint}) called with scope ${scope}")

    if (scope != null) return

    scope =
        CoroutineScope(SupervisorJob() + Dispatchers.IO).apply {
          launch {
            uploadLoop(endpoint, apiKey)
          }
        }
  }

  fun stop() {
    scope?.cancel()
    Log.i(TAG, "stopped, scope ${scope} cancelled")

    scope = null
  }

  private suspend fun uploadLoop(endpoint: String, apiKey: String) {
    try {
      Log.i(TAG, "starting upload loop")
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
    } catch (e: CancellationException) {
      Log.i(TAG, "upload loop cancelled")
      throw e
    } finally {
      Log.i(TAG, "upload loop finished")
    }
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
