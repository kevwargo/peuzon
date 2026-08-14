import { useContext, useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import Controller from "../native/controller";
import Tracker from "../native/tracker";
import { DeviceInfoContext } from "../providers/DeviceInfoProvider";
import BatteryExemptDialog from "./BatteryExemptDialog";

function Root() {
  const deviceInfo = useContext(DeviceInfoContext);

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);

  const startTracking = () => {
    setLoading(true);
    Tracker.start()
      .then(() => console.log("Tracking start request succeeded"))
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    Tracker.getState()
      .then(s => {
        if (s) {
          setStarted(s.started);
          console.log(`Tracker started: ${s.started}`);
        } else {
          console.log("Tracker state is null");
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

    return Tracker.addStateChangeListener(s => {
      console.log(`Received state change event - ${s}`);
      setStarted(s);
      setLoading(false);
    });
  }, []);

  const stopTracking = () => {
    setLoading(true);
    Tracker.stop()
      .then(() => console.log("Tracking stop request succeeded"))
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  return (
    <View>
      <Button
        color="red"
        title="EXIT"
        onPress={() => {
          Controller.closeUI()
            .then(() => console.log("Exit success"))
            .catch(err => console.log(err));
        }}
      />
      <BatteryExemptDialog />
      <Text style={styles.text}>
        Hi, <Text style={styles.deviceName}>{deviceInfo?.name}</Text>
      </Text>
      {started ? (
        <Button title="Stop" disabled={loading} onPress={stopTracking} />
      ) : (
        <Button title="Start" disabled={loading} onPress={startTracking} />
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
  exitButton: {
    backgroundColor: "red",
  },
});

export default Root;
