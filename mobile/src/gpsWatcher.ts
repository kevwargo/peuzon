import Geolocation, { GeolocationResponse } from "@react-native-community/geolocation";
import { useCallback, useState } from "react";
import { Session } from "./session";
import dt from "./dt";

function useGPSWatcher({ log, session: { sendGPS } }: GPSWatcherProps): GPSWatcher {
  const [watchId, setWatchId] = useState<number | null>(null);
  const [lastPos, setLastPos] = useState<GeolocationResponse | null>(null);

  const start = useCallback(() => {
    try {
      log("starting GPS...");
      const wid = Geolocation.watchPosition(
        position => {
          log(`GPS(${dt(position.timestamp)}): ${JSON.stringify(position)}`);
          setLastPos(position);
          sendGPS({
            pos: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
            timestamp: position.timestamp,
          });
        },
        error => () => {
          log(`WatchPosition error: ${JSON.stringify(error)}`);
        },
        {
          interval: 1000,
          fastestInterval: 500,
          enableHighAccuracy: true,
          distanceFilter: 0,
        },
      );
      setWatchId(wid);
    } catch (e) {
      log(`EXC: setupGPS(): ${e}`);
    }
  }, [log, sendGPS]);

  const stop = useCallback(() => {
    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  return {
    start,
    started: watchId !== null,
    stop,
    pos: lastPos,
  };
}

export interface GPSWatcher {
  start: () => void;
  started: boolean;
  stop: () => void;
  pos: GeolocationResponse | null;
}

export interface GPSWatcherProps {
  log: (msg: string) => void;
  session: Session;
}

export default useGPSWatcher;
