import { MapContainer, TileLayer } from "react-leaflet";
import type { TrackerProps } from "./Tracker";
import Tracker from "./Tracker";

function Map({ start, registerGPSListener }: TrackerProps) {
  return (
    <MapContainer center={start} zoom={15} style={{ height: "600px", width: "100%" }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Tracker registerGPSListener={registerGPSListener} start={start} />
    </MapContainer>
  );
}

export default Map;
