
import {MapContainer,TileLayer,Marker,Popup,Polyline} from "react-leaflet";
import L from "leaflet";
import { vesselImages } from "../config/vesselImages";

// Default configuration
const DEFAULT_CENTER = [19.076, 72.8777]; // Mumbai
const DEFAULT_ZOOM = 6;

// Google Maps-style tile layer (Esri World Street Map - looks like Google Maps)
// Using language=en for English-only labels
const GOOGLE_MAPS_TILE_LAYER = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";

const shipIcon = new L.Icon({
 iconUrl:"https://cdn-icons-png.flaticon.com/512/60/60773.png",
 iconSize:[32,32]
});

export default function VesselMap({ vessels, center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM }){

 return(
  <MapContainer center={center} zoom={zoom} style={{height:"100%", minHeight:"500px"}}>

   <TileLayer 
     url={GOOGLE_MAPS_TILE_LAYER}
     attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a> contributors & Esri'
   />

   {vessels.map(v=>{
    const pos=[v.lat,v.lon]
    // Find matching vessel image based on vessel name
    const vesselImage = vesselImages.find(img => 
      img.title.toLowerCase() === v.vesselName?.toLowerCase() ||
      img.vessel.toLowerCase() === v.vesselName?.toLowerCase()
    );
    return(
     <Marker key={v.mmsi} position={pos} icon={shipIcon}>
      <Popup>
       {vesselImage && <img src={vesselImage.src} alt={v.vesselName} style={{width: '150px', height: '100px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px'}} />}
       <b>{v.vesselName}</b><br/>
       Speed: {v.speed} knots<br/>
       Destination: {v.destination}
      </Popup>
     </Marker>
    )
   })}

   {vessels.map(v=>(
    v.history && <Polyline key={v.mmsi+"track"} positions={v.history} color="blue"/>
   ))}

  </MapContainer>
 )
}
