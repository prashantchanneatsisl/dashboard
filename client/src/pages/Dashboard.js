
import React,{useEffect,useState} from "react";
import {listenAIS} from "../services/socketService";
import VesselMap from "../components/VesselMap";
import VesselList from "../components/VesselList";

export default function Dashboard(){

 const [vessels,setVessels]=useState({});

 useEffect(()=>{
   listenAIS(updateVessel);
 },[]);

 const updateVessel=(v)=>{
   setVessels(prev=>({...prev,[v.mmsi]:v}))
 }

 const vesselArray=Object.values(vessels);

 return(
   <div style={{display:"flex"}}>
     <div style={{width:"30%",background:"#eef2f7"}}>
       <VesselList vessels={vesselArray}/>
     </div>
     <div style={{width:"70%"}}>
       <VesselMap vessels={vesselArray}/>
     </div>
   </div>
 )
}
