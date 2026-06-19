import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Tracker from "./tracker";

function BatteryExemptDialog() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    Tracker.isBatteryThrottled()
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
      await Tracker.requestBatteryExemption();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <View>
      <Modal animationType="slide" transparent={true} visible={visible}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>
              The app needs battery optimization exemption so that it's not killed by the system
              when tracking is in progress
            </Text>
            <Pressable style={[styles.button, styles.buttonClose]} onPress={request}>
              <Text style={styles.textStyle}>Request exemption</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "#2196F3",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
  },
});

export default BatteryExemptDialog;
