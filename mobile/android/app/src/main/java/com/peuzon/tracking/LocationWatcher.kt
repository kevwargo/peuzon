package com.peuzon.tracking

import android.content.Context
import android.location.Location
import android.util.Log
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.Granularity
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.channels.Channel

class LocationWatcher(
    private val ch: Channel<Location>,
    private val onNewLocation: (LocationEvent) -> Unit,
) {

  companion object {
    private const val INTERVAL_MS = 10_000L
    private const val DISTANCE_METERS = 5.0f

    private const val TAG = "LocationWatcher"
  }

  private var client: FusedLocationProviderClient? = null
  private var started = false
  private var seqNo = 0L

  fun start(ctx: Context) {
    if (started) {
      Log.w(TAG, "already started")
      return
    }

    if (client == null) {
      client = LocationServices.getFusedLocationProviderClient(ctx)
    }

    client?.requestLocationUpdates(
        LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
            .setGranularity(Granularity.GRANULARITY_FINE)
            .setMinUpdateDistanceMeters(DISTANCE_METERS)
            .build(),
        callback,
        ctx.mainLooper,
    )

    started = true
    Log.i(TAG, "started")
  }

  fun stop() {
    client?.removeLocationUpdates(callback)
    started = false
    seqNo = 0L
    Log.i(TAG, "stopped")
  }

  private val callback =
      object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
          result.locations.forEach {
            seqNo++
            ch.trySend(it)
            onNewLocation(LocationEvent(it, seqNo))
          }
        }
      }
}
