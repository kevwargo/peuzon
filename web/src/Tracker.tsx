import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

function Tracker({ start, setGPSHandler }: TrackerProps) {
  const traceRef = useRef<L.Polyline | null>(null);
  const posRef = useRef<L.Marker | null>(null);

  const map = useMap();

  useEffect(() => {
    traceRef.current = L.polyline([], {
      color: "red",
    }).addTo(map);
    posRef.current = L.marker(start).addTo(map);

    setGPSHandler(msg => {
      console.log("added wpt", msg.pos);
      traceRef.current?.addLatLng(msg.pos);
      posRef.current?.setLatLng(msg.pos);
    });

    return () => {
      traceRef.current?.remove();
      posRef.current?.remove();
    };
  }, [map, start, setGPSHandler]);

  return null;
}

export interface GPSMsg {
  pos: Pos;
  timestamp: number;
}

export interface Pos {
  lat: number;
  lng: number;
}

export interface TrackerProps {
  start: Pos;
  setGPSHandler: (handler: (msg: GPSMsg) => void) => void;
}

export default Tracker;
