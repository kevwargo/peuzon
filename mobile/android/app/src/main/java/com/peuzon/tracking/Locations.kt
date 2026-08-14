package com.peuzon.tracking

import android.location.Location
import org.json.JSONArray
import org.json.JSONObject

fun Location.toMap(): MutableMap<String, Number> =
    mutableMapOf(
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

class LocationEvent(private val loc: Location, private val seqNo: Long) {
  fun toMap(): Map<String, Number> {
    val map = loc.toMap()
    map["seqNo"] = seqNo
    return map
  }
}
