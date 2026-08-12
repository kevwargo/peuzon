import { NativeModules } from "react-native";

const Device = NativeModules.Device as {
  getUUID: () => Promise<string>;
};

export default Device;
