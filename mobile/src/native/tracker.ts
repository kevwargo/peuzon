import { NativeEventEmitter, NativeModules, PermissionsAndroid } from "react-native";
import { Location } from "./location";

const intTracker = NativeModules.Tracker as {
  getState: () => Promise<TrackerState | null>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
};

export interface TrackerState {
  started: boolean;
}

const locationGranted = async (): Promise<boolean> => {
  return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
};

const addListener = (eventType: string, callback: (event: any) => void) => {
  const eventEmitter = new NativeEventEmitter(NativeModules.Tracker);
  let listener = eventEmitter.addListener(eventType, callback);

  return () => {
    listener.remove();
  };
};

const Tracker = {
  getState: async (): Promise<TrackerState | null> => {
    return await intTracker.getState();
  },
  start: async (): Promise<void> => {
    if (!(await locationGranted())) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      ]);
      console.log(`Location request result: ${JSON.stringify(result)}`);
    }

    return await intTracker.startTracking();
  },
  stop: intTracker.stopTracking,
  addStateChangeListener: (callback: (started: boolean) => void) =>
    addListener("TRACKER_STATE_CHANGED", callback),
  addLocationListener: (callback: (loc: Location) => void) =>
    addListener("TRACKER_NEW_LOCATION", callback),
};

export default Tracker;
