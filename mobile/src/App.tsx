import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import DeviceInfoProvider from "./providers/DeviceInfoProvider";
import Root from "./views/Root";

function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <DeviceInfoProvider>
          <Root />
        </DeviceInfoProvider>
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
});

export default App;
