import { NativeModules, PermissionsAndroid } from "react-native";

const intTracker = NativeModules.LocTrack as {
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  showBatteryExemptions: () => Promise<void>;
  requestBatteryExemption: () => Promise<void>;
};

const locationGranted = async (): Promise<boolean> => {
  return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
};

const Tracker = {
  start: async (): Promise<void> => {
    if (!(await locationGranted())) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      console.log(`Location request result: ${result}`);
    }

    return await intTracker.startTracking();
  },
  stop: intTracker.stopTracking,
  showBatteryExemptions: async () => {
    try {
      await intTracker.showBatteryExemptions();
    } catch (e) {
      console.error(e);
    }
  },
  requestBatteryExemption: async () => {
    try {
      await intTracker.requestBatteryExemption();
    } catch (e) {
      console.error(e);
    }
  },
};

export default Tracker;
