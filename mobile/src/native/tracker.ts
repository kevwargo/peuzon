import { NativeModules, PermissionsAndroid } from "react-native";

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
};

export default Tracker;
