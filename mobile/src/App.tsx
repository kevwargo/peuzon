/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useState } from "react";
import { Button, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import BatteryExemptDialog from "./Battery";
import Tracker from "./tracker";

function App() {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);

  const createCallback = (fn: () => Promise<void>, startState: boolean) => async () => {
    setLoading(true);
    try {
      await fn();
      setStarted(startState);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <BatteryExemptDialog />
        {started ? (
          <Button
            disabled={loading}
            title="Stop FGS"
            onPress={createCallback(Tracker.stop, false)}
          />
        ) : (
          <Button
            disabled={loading}
            title="Start FGS"
            onPress={createCallback(Tracker.start, true)}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#5a7f05",
  },
  text: {
    color: "#994ce5",
  },
});

export default App;
