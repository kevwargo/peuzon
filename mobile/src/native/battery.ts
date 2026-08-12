import { NativeModules } from "react-native";

const Battery = NativeModules.Battery as {
  isThrottled: () => Promise<boolean>;
  requestExemption: () => Promise<void>;
};

export default Battery;
