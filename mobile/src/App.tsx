/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import Geolocation, { GeolocationResponse } from "@react-native-community/geolocation";
import { useEffect, useRef, useState } from "react";
import { Button, Linking, StyleSheet, Text as RNText, TextProps, View } from "react-native";
import env from "../env.json";

function App() {
  return (
    <View style={styles.container}>
      <Text>URL: {env.API_URL}</Text>
      <PositionContainer />
    </View>
  );
}

function PositionContainer() {
  const [pos, setPos] = useState<GeolocationResponse | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const sessRef = useRef<string | null>(null);

  const startWatch = async () => {
    try {
      if (sessRef.current === null) {
        console.log("creating session...");
        const sessResp = await fetch(`${env.API_URL}/sessions`, {
          method: "POST",
          headers: { Authorization: env.API_KEY },
        });
        const sessId = await sessResp.text();
        console.log(`Session ${sessId} created`);

        if (await Linking.canOpenURL("tg://")) {
          console.log("Telegram works!");
          const urls = [env.WEBSITE_URL, "http://localhost:5173"]
            .map(u => `${u}?s=${sessId}`)
            .join("\n");
          try {
            await Linking.openURL(`tg://msg?text=${encodeURIComponent(urls)}`);
          } catch (err) {
            console.error("Failed to open tg link", err);
          }
        } else {
          console.log("No Telegram :(");
        }

        sessRef.current = sessId;
        console.log("stored session in ref", sessRef.current);
      } else {
        console.log("reusing session", sessRef.current);
      }

      console.log("starting GPS...");
      const wid = Geolocation.watchPosition(
        async position => {
          console.log("watchPosition", JSON.stringify(position));
          setPos(position);
          setMsg(null);
          try {
            const resp = await fetch(`${env.API_URL}/sessions/${sessRef.current}/points`, {
              method: "POST",
              headers: { Authorization: env.API_KEY },
              body: JSON.stringify({
                timestamp: position.timestamp,
                pos: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                },
              }),
            });
            console.log("addPoint resp", resp.status);
          } catch (err) {
            console.log(`fetch error ${err}`);
          }
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
      console.error("Exception", JSON.stringify(error));
      setMsg(`Exception: ${JSON.stringify(error)}`);
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
