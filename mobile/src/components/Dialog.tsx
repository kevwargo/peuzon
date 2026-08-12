import { PropsWithChildren } from "react";
import { Modal, StyleSheet, View } from "react-native";

const Dialog = ({ children }: PropsWithChildren) => (
  <Modal animationType="slide" transparent={true} visible={true}>
    <View style={styles.centeredView}>
      <View style={styles.modalView}>{children}</View>
    </View>
  </Modal>
);

export default Dialog;

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
    gap: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
