import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Dialog from "../components/Dialog";
import Battery from "../native/battery";

function BatteryExemptDialog() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    Battery.isThrottled()
      .then(throttled => {
        if (throttled) {
          setVisible(true);
        } else {
          console.log("Already exempted from battery optimizations");
        }
      })
      .catch(console.error);
  }, []);

  const request = async () => {
    setVisible(false);

    try {
      await Battery.requestExemption();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    visible && (
      <Dialog>
        <Text style={styles.modalText}>
          The app needs battery optimization exemption so that it's not killed by the system when
          tracking is in progress
        </Text>
        <Pressable style={styles.button} onPress={request}>
          <Text style={styles.buttonText}>Request exemption</Text>
        </Pressable>
      </Dialog>
    )
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    backgroundColor: "#2196F3",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalText: {
    marginBottom: 12,
    textAlign: "center",
  },
});

export default BatteryExemptDialog;
