/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import Geolocation, { GeolocationResponse } from "@react-native-community/geolocation";
import { useEffect, useState } from "react";
import { Button, Platform, StyleSheet, Text as RNText, TextProps, View } from "react-native";

function App() {
  return (
    <View style={styles.container}>
      <Text>Platform: {Platform.Version}</Text>
      <PositionContainer />
    </View>
  );
}

function PositionContainer() {
  const [pos, setPos] = useState<GeolocationResponse | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  const startWatch = () => {
    try {
      console.log("starting GPS...");
      const wid = Geolocation.watchPosition(
        position => {
          console.log("watchPosition", JSON.stringify(position));
          setPos(position);
          setMsg(null);
        },
        error => () => {
          console.error("WatchPosition Error", JSON.stringify(error));
          setMsg(`WatchPosition Error: ${JSON.stringify(error)}`);
        },
        {
          interval: 1000,
          fastestInterval: 500,
          enableHighAccuracy: true,
          distanceFilter: 0,
        },
      );
      setWatchId(wid);
    } catch (error) {
      console.error("WatchPosition Error", JSON.stringify(error));
      setMsg(`WatchPosition exception: ${JSON.stringify(error)}`);
    }
  };

  const clearWatch = () => {
    watchId !== null && Geolocation.clearWatch(watchId);
    setWatchId(null);
    setPos(null);
    setMsg(null);
  };

  useEffect(() => {
    return () => {
      clearWatch();
    };
  }, []);

  return (
    <View>
      <Text>GPS: </Text>
      {msg ? (
        <Text style={styles.error}>Msg: {msg}</Text>
      ) : pos ? (
        <Position pos={pos} />
      ) : (
        <Text>unknown</Text>
      )}
      {watchId ? (
        <>
          <Button title="clear" onPress={clearWatch} />
          <Text>Watch ID: {watchId}</Text>
        </>
      ) : (
        <Button title="watch" onPress={startWatch} />
      )}
    </View>
  );
}

function Position({ pos }: { pos: GeolocationResponse }) {
  return (
    <View>
      <Text>Time: {new Date(pos.timestamp).toISOString()}</Text>
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
    margin: 15,
  },
  text: {
    color: "white",
  },
  error: {
    color: "red",
    fontWeight: "bold",
  },
});

export default App;
