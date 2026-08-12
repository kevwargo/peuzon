import { useContext } from "react";
import { StyleSheet, Text, View } from "react-native";
import { DeviceInfoContext } from "../providers/DeviceInfoProvider";
import BatteryExemptDialog from "./BatteryExemptDialog";

function Root() {
  const deviceInfo = useContext(DeviceInfoContext);

  return (
    <View>
      <BatteryExemptDialog />
      <Text style={styles.text}>
        Hi, <Text style={styles.deviceName}>{deviceInfo?.name}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    color: "#e4f8ff",
  },
  deviceName: {
    fontSize: 30,
    fontWeight: "bold",
  },
});

export default Root;
