import { useEffect, useRef, useState } from "react";
import outputs from "../../backend/cdk.out/outputs.json";
import "./App.css";
import Map from "./Map";
import type { GPSMsg, Pos } from "./Tracker";

const WS_URL = outputs.PeuzonStack.WebSocketUrl;

function App() {
  const [startPos, setStartPos] = useState<Pos | null>(null);
  const [loadLog, setLoadLog] = useState(["initializing..."]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsock = new WebSocket(`${WS_URL}${window.location.search}`);
    setLoadLog(old => [...old, "websocket created"]);

    const onFirstPos = (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data) as GPSMsg;
        console.log("Start", new Date(msg.timestamp).toISOString(), msg.pos);
        setStartPos(msg.pos);
        wsRef.current = wsock;
        wsock.removeEventListener("message", onFirstPos);
      } catch (err) {
        console.error("exception on first pos", err);
      }
    };

    wsock.addEventListener("message", onFirstPos);

    wsock.onopen = () => setLoadLog(old => [...old, "WS opened"]);
    wsock.onclose = ev => {
      setLoadLog(old => [...old, "WS closed"]);
      console.log("ws-close", ev);
    };
    wsock.onerror = ev => {
      setLoadLog(old => [...old, "WS failed"]);
      console.error("ws-error", ev);
    };

    return () => wsock.close();
  }, []);

  const registerGPSListener = (handler: (msg: GPSMsg) => void) => {
    const wrapper = (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data) as GPSMsg;
        handler(msg);
      } catch (err) {
        console.error("exception in secondary GPS msg handler", err);
      }
    };

    wsRef.current?.addEventListener("message", wrapper);
    console.log("added GPS handler", handler);

    return () => {
      wsRef.current?.removeEventListener("message", wrapper);
      console.log("removed GPS handler", handler);
    };
  };

  return (
    <>
      <h1>PEUZON</h1>
      {startPos ? (
        <Map start={startPos} registerGPSListener={registerGPSListener} />
      ) : (
        <>
          <h3>Loading...</h3>
          <ul>
            {loadLog.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export default App;
