
import {MapContainer,TileLayer,Marker,Popup,Polyline} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";

// Default configuration
const DEFAULT_CENTER = [19.076, 72.8777]; // Mumbai
const DEFAULT_ZOOM = 6;

const shipIcon = new L.Icon({
 iconUrl:"https://cdn-icons-png.flaticon.com/512/60/60773.png",
 iconSize:[32,32]
});

export default function VesselMap({ vessels, center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM }){

 return(
  <MapContainer center={center} zoom={zoom} style={{height:"100%", minHeight:"500px"}}>

   <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>

   <MarkerClusterGroup>

   {vessels.map(v=>{
    const pos=[v.lat,v.lon]
    return(
     <Marker key={v.mmsi} position={pos} icon={shipIcon}>
      <Popup>
       <b>{v.vesselName}</b><br/>
       Speed: {v.speed} knots<br/>
       Destination: {v.destination}
      </Popup>
     </Marker>
    )
   })}

   </MarkerClusterGroup>

   {vessels.map(v=>(
    v.history && <Polyline key={v.mmsi+"track"} positions={v.history} color="blue"/>
   ))}

  </MapContainer>
 )
}
