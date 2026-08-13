package com.peuzon.tracking

import android.location.Location
import org.json.JSONArray
import org.json.JSONObject

fun Location.toMap() =
    mapOf(
        "ts" to this.time,
        "lat" to this.latitude,
        "lng" to this.longitude,
        "acc" to this.accuracy,
        "alt" to this.altitude,
        "speed" to this.speed,
        "bearing" to this.bearing,
    )

fun Location.toJSON() =
    JSONObject().also { obj ->
      for ((k, v) in toMap()) {
        obj.put(k, v)
      }
    }

fun List<Location>.toJSON() =
    JSONArray().also { arr ->
      for (loc in this) {
        arr.put(loc.toJSON())
      }
    }
