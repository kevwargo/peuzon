import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "./App.css";

function App() {
  return (
    <>
      <h1>PEUZON</h1>
      <MapContainer
        center={[60.4518, 22.2666]}
        zoom={13}
        style={{ height: "500px", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[60.4518, 22.2666]}>
          <Popup>Turku, Finland</Popup>
        </Marker>
      </MapContainer>
    </>
  );
}

export default App;
