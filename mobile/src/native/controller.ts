import { NativeModules } from "react-native";

const Controller = NativeModules.Controller as {
  closeUI: () => Promise<void>;
};

export default Controller;
