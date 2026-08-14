import { formatDistanceToNow } from "date-fns";
import { useContext, useEffect, useState } from "react";
import { Button, Linking, StyleSheet, Text, View } from "react-native";
import { WEBSITE_URL } from "../../env.json";
import Controller from "../native/controller";
import { Location } from "../native/location";
import Tracker from "../native/tracker";
import { DeviceInfoContext } from "../providers/DeviceInfoProvider";
import BatteryExemptDialog from "./BatteryExemptDialog";

function Root() {
  const deviceInfo = useContext(DeviceInfoContext);

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

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
      if (!s) {
        setCurrentLocation(null);
      }
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

  useEffect(
    () =>
      Tracker.addLocationListener(loc => {
        setCurrentLocation(loc);
      }),
    [],
  );

  return (
    <View style={styles.container}>
      <Button
        color="#be5829"
        title="close app"
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
        <>
          <Button title="Stop" disabled={loading} onPress={stopTracking} />
          {deviceInfo?.id && <SendLinkButton deviceId={deviceInfo?.id} />}
        </>
      ) : (
        <Button title="Start" disabled={loading} onPress={startTracking} />
      )}
      {currentLocation && <CurrentLocation loc={currentLocation} />}
    </View>
  );
}

const CurrentLocation = ({ loc }: CurrentLocationProps) => {
  const [elapsed, setElapsed] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setElapsed(
        formatDistanceToNow(loc.ts, {
          includeSeconds: true,
          addSuffix: true,
        }),
      );
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [loc]);

  return (
    <View>
      <Text style={styles.text}>
        LAT: <Text style={styles.location}>{loc.lat}</Text>
      </Text>
      <Text style={styles.text}>
        LNG: <Text style={styles.location}>{loc.lng}</Text>
      </Text>
      <Text style={styles.text}>SeqNo: {loc.seqNo}</Text>
      {elapsed && <Text style={styles.text}>Last location: {elapsed}</Text>}
    </View>
  );
};

interface CurrentLocationProps {
  loc: Location;
}

const SendLinkButton = ({ deviceId }: SendLinkButtonProps) => {
  const webURL = `${WEBSITE_URL}?d=${encodeURI(deviceId)}`;
  const tgURL = `https://t.me/share/url?url=${encodeURIComponent(webURL)}&text=Peuzon+link`;
  const [supported, setSupported] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Linking.canOpenURL(tgURL)
      .then(s => {
        console.log(`Can open ${tgURL} - ${s}`);
        setSupported(s);
      })
      .catch(err => console.error(err));
  }, [tgURL, setSupported]);

  const open = async () => {
    setSending(true);
    try {
      const res = await Linking.openURL(tgURL);
      console.log(`Open ${tgURL} result - ${res}`);
    } finally {
      setSending(false);
    }
  };

  return supported ? (
    <Button title="Send link" onPress={open} disabled={sending} />
  ) : (
    <Button title="Can't send link" disabled={true} />
  );
};

interface SendLinkButtonProps {
  deviceId: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
  },
  text: {
    color: "#e4f8ff",
    textAlign: "center",
  },
  deviceName: {
    fontSize: 30,
    fontWeight: "bold",
  },
  location: {
    fontSize: 24,
    fontWeight: "bold",
  },
});

export default Root;
