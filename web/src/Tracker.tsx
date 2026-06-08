import L from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

function Tracker({ start, registerGPSListener }: TrackerProps) {
  const traceRef = useRef<L.Polyline | null>(null);
  const posRef = useRef<L.Marker | null>(null);

  const map = useMap();

  useEffect(() => {
    traceRef.current = L.polyline([], {
      color: "red",
    }).addTo(map);
    posRef.current = L.marker(start).addTo(map);

    const unregisterGPSListener = registerGPSListener(msg => {
      console.log("added wpt", msg.pos, new Date(msg.timestamp));
      traceRef.current?.addLatLng(msg.pos);
      posRef.current?.setLatLng(msg.pos);
    });

    return () => {
      traceRef.current?.remove();
      posRef.current?.remove();
      unregisterGPSListener();
    };
  }, [map, start, registerGPSListener]);

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
  registerGPSListener: (handler: (msg: GPSMsg) => void) => () => void;
}

export default Tracker;
