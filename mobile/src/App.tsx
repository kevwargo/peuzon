/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { GeolocationResponse } from "@react-native-community/geolocation";
import { Button, Text as RNText, StyleSheet, TextProps, View } from "react-native";
import LogView, { useLog } from "./LogView";
import dt from "./dt";
import useGPSWatcher from "./gpsWatcher";
import useSession from "./session";

function App() {
  const { entries, log } = useLog();
  const session = useSession(log);
  const gps = useGPSWatcher({ log, session });

  return (
    <View style={styles.container}>
      {gps.started ? (
        <>
          {gps.pos && <Position pos={gps.pos} />}
          <Button title="stop" onPress={gps.stop} />
        </>
      ) : (
        <Button title="start" onPress={gps.start} />
      )}
      <LogView entries={entries} />
    </View>
  );
}

function Position({ pos }: { pos: GeolocationResponse }) {
  return (
    <View>
      <Text>Time: {dt(pos.timestamp)}</Text>
      <Text>Lat: {pos.coords.latitude}</Text>
      <Text>Lon: {pos.coords.longitude}</Text>
    </View>
  );
}

function Text(props: TextProps) {
  return <RNText {...props} style={[styles.text, props.style]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#d1f101",
  },
  text: {
    color: "#994ce5",
  },
});

export default App;
