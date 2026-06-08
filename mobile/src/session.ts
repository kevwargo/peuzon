import { useRef } from "react";
import { Linking } from "react-native";
import env from "../env.json";
import dt from "./dt";

function useSession(log: (msg: string) => void): Session {
  const sessRef = useRef<string | null>(null);

  const getId = async (): Promise<string> => {
    if (sessRef.current === null) {
      try {
        const resp = await apiPost();
        if (resp.status !== 200) {
          throw new Error(`API [${resp.status}] ${await resp.text()}`);
        }

        sessRef.current = await resp.text();
      } catch (e) {
        log(`EXC: createSession(): ${e}`);
        throw e;
      }

      log(`Created session ${sessRef.current}`);
      shareSession(sessRef.current);
    } else {
      log(`Using existing session ${sessRef.current}`);
    }

    return sessRef.current;
  };

  const shareSession = async (sessId: string) => {
    try {
      if (await Linking.canOpenURL("tg://")) {
        log("Telegram works!");
        const urls = [env.WEBSITE_URL, "http://localhost:5173"]
          .map(u => `${u}?s=${sessId}`)
          .join("\n");
        await Linking.openURL(`tg://msg?text=${encodeURIComponent(urls)}`);
      } else {
        log("No Telegram :(");
      }
    } catch (e) {
      log(`EXC: shareSession(): ${e}`);
    }
  };

  const sendGPS = async (gps: GPS) => {
    try {
      const sessId = await getId();
      const resp = await apiPost(`/${sessId}/points`, JSON.stringify(gps));

      if (resp.status === 200) {
        log(`sent GPS from ${dt(gps.timestamp)} successfully`);
      } else {
        log(`failed to send GPS from ${dt(gps.timestamp)}: [${resp.status}] ${await resp.text()}`);
      }
    } catch (e) {
      log(`EXC sendGPS(): ${e}`);
    }
  };

  return { sendGPS };
}

async function apiPost(urlSuffix?: string, body?: string) {
  const url = `${env.API_URL}/sessions${urlSuffix ?? ""}`;

  return await fetch(url, {
    method: "POST",
    headers: { Authorization: env.API_KEY },
    body,
  });
}

export interface Session {
  sendGPS(gps: GPS): void;
}

export interface GPS {
  timestamp: number;
  pos: GPSPos;
}

export interface GPSPos {
  lat: number;
  lng: number;
}

export default useSession;
