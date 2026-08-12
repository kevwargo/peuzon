import { APIError, get, put } from ".";

export async function getDeviceName(id: string): Promise<string | null> {
  try {
    const resp = await get<Device>(`/devices/${id}`);
    return resp.name;
  } catch (e) {
    if (e instanceof APIError && e.code === 404) {
      return null;
    }
    throw e;
  }
}

export async function setDeviceName(id: string, name: string): Promise<undefined> {
  await put(`/devices/${id}`, { name });
}

interface Device {
  name: string;
}
