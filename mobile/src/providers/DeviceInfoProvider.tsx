import { createContext, PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, Button, Modal, TextInput, View } from "react-native";
import { getDeviceName, setDeviceName } from "../api/device";
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
    <Modal animationType="slide" transparent={true} visible={true}>
      <View>
        {settingName && <ActivityIndicator size="small" />}

        <TextInput placeholder="New device name" value={nameInput} onChangeText={setNameInput} />
        <Button disabled={settingName || !nameInput} title="submit" onPress={submitName} />
      </View>
    </Modal>
  ) : (
    <DeviceInfoContext value={{ id, name }}>{children}</DeviceInfoContext>
  );
}

export default DeviceInfoProvider;
