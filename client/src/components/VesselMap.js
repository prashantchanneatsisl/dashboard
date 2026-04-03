
import {MapContainer,TileLayer,Marker,Popup,Polyline,Tooltip} from "react-leaflet";
import L from "leaflet";
import { useRef } from "react";
import { vesselImages } from "../config/vesselImages";

const DEFAULT_CENTER = [19.076, 72.8777];
const DEFAULT_ZOOM = 2;

const BASE_TILE_LAYER = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

const createVesselIcon = (status, heading = 0) => {
  const colors = {
    moving: '#00ff00',
    anchored: '#ff0000',
    warning: '#ffff00'
  };
  const color = colors[status] || colors.moving;
  
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <polygon points="20,2 38,35 20,28 2,35" fill="${color}" stroke="#000000" stroke-width="2" 
        transform="rotate(${heading - 90}, 20, 20)">
        <animate attributeName="opacity" values="1;0.8;1" dur="1.5s" repeatCount="indefinite"/>
      </polygon>
      <circle cx="20" cy="20" r="4" fill="#ffffff" opacity="1"/>
    </svg>
  `;
  
  return new L.DivIcon({
    html: svgIcon,
    className: 'vessel-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

const getVesselStatus = (vessel) => {
  const speed = vessel.speed || 0;
  const navStatus = vessel.navStatus || vessel.status;
  
  if (navStatus === 'war' || navStatus === 'restricted' || navStatus === 'moored') {
    return 'warning';
  }
  if (speed < 0.5 || speed === 0 || navStatus === 'anchored') {
    return 'anchored';
  }
  return 'moving';
};

const getVesselHeading = (vessel) => {
  return vessel.cog || vessel.heading || vessel.course || 0;
};

export default function VesselMap({ vessels, center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM, onVesselSelect, onMapReady }){
  const mapRef = useRef(null);
  
  const handleMapReady = () => {
    if (mapRef.current && onMapReady) {
      onMapReady(mapRef.current);
    }
  };
  
  // Ensure vessels is always an array
  const vesselArray = Array.isArray(vessels) ? vessels : [];

  const handleMarkerClick = (vessel) => {
    if (onVesselSelect) {
      onVesselSelect(vessel);
    }
  };
 
   return(
    <MapContainer 
      ref={mapRef}
      center={center} 
      zoom={zoom} 
      style={{height:"100%", minHeight:"500px", border: "5px solid #000080", borderRadius: "8px"}}
      whenReady={handleMapReady}
    >
      <TileLayer 
        url={BASE_TILE_LAYER}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
      const vesselStatus = getVesselStatus(v);
      const vesselHeading = getVesselHeading(v);
      const dynamicIcon = createVesselIcon(vesselStatus, vesselHeading);
      const vesselImage = vesselImages.find(img => 
        img.title.toLowerCase() === v.vesselName?.toLowerCase() ||
        img.vessel.toLowerCase() === v.vesselName?.toLowerCase()
      );
      return(
  <Marker key={v.mmsi} position={pos} icon={dynamicIcon} eventHandlers={{ click: () => handleMarkerClick(v) }}>
        <Popup>
         {vesselImage && <img src={vesselImage.src} alt={v.vesselName} style={{width: '150px', height: '100px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px'}} />}
         <b>{v.vesselName}</b><br/>
         MMSI: {v.mmsi}<br/>
         Speed: {v.speed} knots<br/>
         Status: <span style={{color: vesselStatus === 'moving' ? '#00ff00' : vesselStatus === 'anchored' ? '#ff0000' : '#ffff00', fontWeight: 'bold', backgroundColor: '#000', padding: '2px 4px'}}>
             {vesselStatus === 'moving' ? 'Moving' : vesselStatus === 'anchored' ? 'Anchored' : 'Warning'}
          </span><br/>
         Heading: {vesselHeading}°<br/>
         Destination: {v.destination}
        </Popup>
       <Tooltip permanent direction="top" offset={[0,-25]} className="vessel-tooltip">
         <span style={{color: '#000000', fontWeight: 'bold', fontSize: '12px', backgroundColor: 'white', padding: '2px 6px', borderRadius: '4px'}}>{v.vesselName}</span>
       </Tooltip>
      </Marker>
     )
    })}

    {vesselArray.map(v=>{
      const vesselStatus = getVesselStatus(v);
      return v.history && vesselStatus === 'moving' && <Polyline key={v.mmsi+"track"} positions={v.history} color="#2196F3" weight={3} opacity={1}/>;
    })}

   </MapContainer>
  )
}
