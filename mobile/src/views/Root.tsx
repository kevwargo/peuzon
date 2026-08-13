import { useContext, useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import Controller from "../native/controller";
import Tracker from "../native/tracker";
import { DeviceInfoContext } from "../providers/DeviceInfoProvider";
import BatteryExemptDialog from "./BatteryExemptDialog";

function Root() {
  const deviceInfo = useContext(DeviceInfoContext);

  const [alreadyStarted, setAlreadyStarted] = useState(false);
  const [startedManually, setStartedManually] = useState(false);
  const [starting, setStarting] = useState(false);

  const startBeacon = () => {
    setStarting(true);
    Tracker.start()
      .then(() => {
        setStartedManually(true);
      })
      .catch(err => console.error(err))
      .finally(() => setStarting(false));
  };

  useEffect(() => {
    Tracker.getState()
      .then(s => {
        if (s) {
          if (s.started) {
            setAlreadyStarted(true);
            console.log("Tracker is started");
          } else {
            console.log("Tracker is not started");
          }
        } else {
          console.log("Tracker state is null");
        }
      })
      .catch(err => console.error(err));
  }, []);

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
      {alreadyStarted ? (
        <Text style={styles.text}>Started earlier</Text>
      ) : startedManually ? (
        <Text style={styles.text}>Started manually</Text>
      ) : (
        <Button title="Start" disabled={starting} onPress={startBeacon} />
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
