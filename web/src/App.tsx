import "./App.css";
import outputs from "../../backend/cdk.out/outputs.json";
import Map from "./Map";
import { useEffect, useRef, useState } from "react";
import type { GPSMsg, Pos } from "./Tracker";

const WS_URL = outputs.PeuzonStack.WebSocketUrl;

function App() {
  const [startPos, setStartPos] = useState<Pos | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (wsRef.current !== null) {
      console.log("start effect with ws initialized");
      return () => undefined;
    }
    console.log("start effect without ws");

    const wsock = new WebSocket(`${WS_URL}${window.location.search}`);

    wsock.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data) as GPSMsg;
        console.log("Received start pos", new Date(msg.timestamp).toISOString(), msg.pos);
        setStartPos(msg.pos);
        wsRef.current = wsock;
        wsock.onmessage = null;
      } catch (err) {
        console.error("exception in initial msg handler", err);
      }
    };

    wsock.onclose = ev => console.log("ws-close", ev);
    wsock.onerror = ev => console.error("ws-error", ev);

    return () => {
      console.log("closing ws");
      wsock.close();
    };
  }, []);

  const setGPSHandler = (handler: (msg: GPSMsg) => void) => {
    if (wsRef.current)
      wsRef.current.onmessage = ev => {
        try {
          const msg = JSON.parse(ev.data) as GPSMsg;
          handler(msg);
        } catch (err) {
          console.error("exception in secondary GPS msg handler", err);
        }
      };
  };

  return (
    <>
      <h1>PEUZON</h1>
      {startPos && <Map start={startPos} setGPSHandler={setGPSHandler} />}
    </>
  );
}

export default App;
