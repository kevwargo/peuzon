import { useContext, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import Tracker from "../native/tracker";
import { DeviceInfoContext } from "../providers/DeviceInfoProvider";
import BatteryExemptDialog from "./BatteryExemptDialog";

function Root() {
  const deviceInfo = useContext(DeviceInfoContext);

  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);

  const startBeacon = () => {
    setStarting(true);
    Tracker.start()
      .then(() => {
        setStarted(true);
      })
      .catch(err => console.error(err))
      .finally(() => setStarting(false));
  };

  return (
    <View>
      <BatteryExemptDialog />
      <Text style={styles.text}>
        Hi, <Text style={styles.deviceName}>{deviceInfo?.name}</Text>
      </Text>
      {started ? (
        <Text style={styles.text}>Beacon is active...</Text>
      ) : (
        <Button title="start beacon" disabled={starting} onPress={startBeacon} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    color: "#e4f8ff",
    textAlign: "center",
  },
  deviceName: {
    fontSize: 30,
    fontWeight: "bold",
  },
});

export default Root;
