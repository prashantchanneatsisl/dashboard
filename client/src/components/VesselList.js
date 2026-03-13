
import VesselCard from "./VesselCard";

export default function VesselList({vessels}){
 return(
  <div style={{height:"90vh",overflowY:"auto",padding:"10px"}}>
   {vessels.map(v=>(<VesselCard key={v.mmsi} vessel={v}/>))}
  </div>
 )
}
