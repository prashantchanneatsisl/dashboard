
import {MapContainer,TileLayer,Marker,Popup,Polyline} from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef } from "react";
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
  const mapRef = useRef(null);
  
  // Ensure vessels is always an array
  const vesselArray = Array.isArray(vessels) ? vessels : [];
  
  // Auto-pan to first vessel if available and map is ready
  // Use ref to track user zoom level to preserve it
  const userZoomRef = useRef(zoom);
  
  useEffect(() => {
    userZoomRef.current = zoom;
  }, [zoom]);
  
  useEffect(() => {
    if (vesselArray.length > 0 && mapRef.current) {
      const firstVessel = vesselArray[0];
      if (firstVessel.lat && firstVessel.lon) {
        // Use current zoom level (user's choice) instead of hardcoding 10
        const currentZoom = mapRef.current.getZoom();
        mapRef.current.setView([firstVessel.lat, firstVessel.lon], currentZoom);
      }
    }
  }, [vesselArray]);
 
 return(
   <MapContainer 
     ref={mapRef}
     center={center} 
     zoom={zoom} 
     style={{height:"100%", minHeight:"500px"}}
   >

    <TileLayer 
      url={GOOGLE_MAPS_TILE_LAYER}
      attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a> contributors & Esri'
    />

    {(vesselArray.length === 0) && (
      <Popup position={center}>
        <div style={{textAlign: 'center'}}>
          <b>No vessels detected</b><br/>
          Waiting for AIS data...
        </div>
      </Popup>
    )}

    {vesselArray.map(v=>{
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
        MMSI: {v.mmsi}<br/>
        Speed: {v.speed} knots<br/>
        Destination: {v.destination}
       </Popup>
      </Marker>
     )
    })}

    {vesselArray.map(v=>(
     v.history && <Polyline key={v.mmsi+"track"} positions={v.history} color="blue"/>
    ))}

   </MapContainer>
  )
}
