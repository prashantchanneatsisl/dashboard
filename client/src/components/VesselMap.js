
import {MapContainer,TileLayer,Marker,Popup,Polyline} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";

const shipIcon = new L.Icon({
 iconUrl:"https://cdn-icons-png.flaticon.com/512/60/60773.png",
 iconSize:[32,32]
});

export default function VesselMap({vessels}){

 return(
  <MapContainer center={[19,72.8]} zoom={6} style={{height:"90vh"}}>

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
