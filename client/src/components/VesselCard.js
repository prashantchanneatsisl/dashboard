
export default function VesselCard({vessel}){
 return(
  <div style={{border:"1px solid #ccc",padding:"12px",marginBottom:"10px",borderRadius:"6px",background:"#f5f7fa"}}>
    <h4>{vessel.vesselName}</h4>
    <div>MMSI: {vessel.mmsi}</div>
    <div>Speed: {vessel.speed} knots</div>
    <div>Destination: {vessel.destination}</div>
  </div>
 )
}
