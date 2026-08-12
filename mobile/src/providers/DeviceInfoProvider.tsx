import { createContext, PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, Button, StyleSheet, Text, TextInput } from "react-native";
import { getDeviceName, setDeviceName } from "../api/device";
import Dialog from "../components/Dialog";
import Device from "../native/device";

export interface DeviceInfo {
  id: string;
  name: string;
}

export const DeviceInfoContext = createContext<DeviceInfo | null>(null);

function DeviceInfoProvider({ children }: PropsWithChildren) {
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");

  const [settingName, setSettingName] = useState(false);

  useEffect(() => {
    Device.getUUID()
      .then(id => {
        getDeviceName(id)
          .then(nameResp => {
            if (nameResp) {
              setName(nameResp);
            }
          })
          .catch(err => console.error(err))
          .finally(() => setId(id));
      })
      .catch(err => console.error(err));
  }, []);

  const submitName = () => {
    setSettingName(true);
    setDeviceName(id!, nameInput)
      .then(() => setName(nameInput))
      .catch(err => console.error(err))
      .finally(() => setSettingName(false));
  };

  return !id ? (
    <ActivityIndicator size="large" />
  ) : !name ? (
    <Dialog>
      {settingName && <ActivityIndicator size="small" />}
      <Text style={styles.header}>Your device is unnamed, set new name</Text>
      <TextInput
        style={styles.input}
        placeholder="New device name"
        placeholderTextColor="#80aa80"
        value={nameInput}
        onChangeText={setNameInput}
      />
      <Button disabled={settingName || !nameInput} title="submit" onPress={submitName} />
    </Dialog>
  ) : (
    <DeviceInfoContext value={{ id, name }}>{children}</DeviceInfoContext>
  );
}

const styles = StyleSheet.create({
  input: {
    padding: 5,
    borderColor: "#000",
    borderWidth: 1,
    borderRadius: 3,
    color: "green",
  },
  header: {
    textAlign: "center",
    fontSize: 26,
    color: "black",
  },
});

export default DeviceInfoProvider;
