
import React,{useEffect,useState} from "react";
import {listenAIS} from "../services/socketService";
import VesselMap from "../components/VesselMap";

// Configuration - can be overridden via environment variables
const CONFIG = {
  // Default location: Mumbai port area
  latitude: parseFloat(process.env.REACT_APP_DEFAULT_LAT || "19.076"),
  longitude: parseFloat(process.env.REACT_APP_DEFAULT_LON || "72.8777"),
  zoom: parseInt(process.env.REACT_APP_DEFAULT_ZOOM || "6", 10),
  // Weather refresh interval in milliseconds (default 10 minutes)
  weatherRefreshInterval: parseInt(process.env.REACT_APP_WEATHER_REFRESH_MIN || "10", 10) * 60000
};

// Sample news data - can be replaced with API fetch in production
const newsItems = [
  { id: 1, title: "Maritime Safety Alert: New Regulations Effective 2026", date: "2026-03-13" },
  { id: 2, title: "Port of Mumbai Handles Record Cargo in February", date: "2026-03-12" },
  { id: 3, title: "AIS Tracking System Upgrade Completed", date: "2026-03-11" },
  { id: 4, title: "Weather Advisory: Cyclone Warning in Arabian Sea", date: "2026-03-10" },
  { id: 5, title: "New VTS Station Operational at Jawaharlal Nehru Port", date: "2026-03-09" },
];

export default function Dashboard(){

  const [vessels,setVessels]=useState({});
  const [currentSlide, setCurrentSlide] = useState(0);
  const [weather, setWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(()=>{
    listenAIS(updateVessel);
  },[]);

  // Handle both individual vessel updates and batch updates from server
  const updateVessel=(data)=>{
    if (Array.isArray(data)) {
      // Batch update - received full vessel list from server
      setVessels(() => {
        const newState = {};
        data.forEach(v => {
          newState[v.mmsi] = v;
        });
        return newState;
      });
    } else {
      // Individual vessel update (legacy format)
      setVessels(prev=>({...prev,[data.mmsi]:data}))
    }
  }

  const vesselArray=Object.values(vessels);

  // Fetch weather data from Open-Meteo API (free, no API key needed)
  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        // Use configurable coordinates from CONFIG
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.latitude}&longitude=${CONFIG.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=Asia/Kolkata`;
        const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${CONFIG.latitude}&longitude=${CONFIG.longitude}&current=us_aqi,pm2_5,pm10,ozone&timezone=Asia/Kolkata`;
        
        const [weatherRes, airRes] = await Promise.all([
          fetch(weatherUrl),
          fetch(airQualityUrl)
        ]);
        
        const weatherData = await weatherRes.json();
        const airData = await airRes.json();
        
        setWeather(weatherData.current);
        setAirQuality(airData.current);
        setWeatherLoading(false);
      } catch (error) {
        console.error("Error fetching weather data:", error);
        setWeatherLoading(false);
      }
    };
    
    fetchWeatherData();
    // Refresh using configurable interval
    const interval = setInterval(fetchWeatherData, CONFIG.weatherRefreshInterval);
    return () => clearInterval(interval);
  }, []);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev === 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide(prev => (prev === 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? 1 : prev - 1));
  };

  return(
    <div style={{display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden"}}>
      
      {/* TOP ROW - Marquee Text */}
      <div style={{
        background:"#1a365d",
        color:"white",
        padding:"10px 0",
        overflow:"hidden",
        whiteSpace:"nowrap"
      }}>
        <div style={{
          display:"inline-block",
          animation:"marquee 20s linear infinite",
          paddingLeft:"100%"
        }}>
          <span style={{marginRight:"50px", fontSize:"16px", fontWeight:"bold"}}>
            🚢 MARITIME AIS DASHBOARD - VESSEL TRACKING SYSTEM 
          </span>
          <span style={{marginRight:"50px", fontSize:"16px", fontWeight:"bold"}}>
            📡 LIVE SHIP POSITIONS | PORT STATUS | WEATHER UPDATES 
          </span>
          <span style={{marginRight:"50px", fontSize:"16px", fontWeight:"bold"}}>
            ⚓ TOTAL VESSELS TRACKED: {vesselArray.length} | STAY SAFE AT SEA
          </span>
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>

      {/* MIDDLE ROW - Carousel with News and Map */}
      <div style={{
        flex:"1",
        display:"flex",
        flexDirection:"column",
        overflow:"hidden",
        minHeight:"0",
        position:"relative"
      }}>
        
        {/* Carousel Container */}
        <div style={{
          flex:"1",
          overflow:"hidden",
          position:"relative"
        }}>
          
          {/* Slide 1: Map Section */}
          <div style={{
            width:"100%",
            height:"100%",
            display: currentSlide === 0 ? "block" : "none"
          }}>
            <div style={{width:"100%", height:"100%"}}>
              <VesselMap vessels={vesselArray} center={[CONFIG.latitude, CONFIG.longitude]} zoom={CONFIG.zoom}/>
            </div>
          </div>

          {/* Slide 2: News Section */}
          <div style={{
            width:"100%",
            height:"100%",
            overflow:"auto",
            background:"#f0f4f8",
            padding:"20px",
            display: currentSlide === 1 ? "block" : "none"
          }}>
            <h2 style={{color:"#1a365d", marginBottom:"20px", borderBottom:"2px solid #1a365d", paddingBottom:"10px"}}>
              📰 Maritime News
            </h2>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px"}}>
              <div style={{
                background:"white",
                padding:"20px",
                borderRadius:"12px",
                boxShadow:"0 4px 6px rgba(0,0,0,0.1)",
                borderTop:"4px solid #1a365d"
              }}>
                <h3 style={{margin:"0 0 10px 0", color:"#2d3748", fontSize:"16px"}}>Maritime Safety Alert</h3>
                <p style={{color:"#4a5568", fontSize:"14px", margin:"0 0 10px 0"}}>New safety regulations effective 2026 for all vessels operating in Indian waters.</p>
                <span style={{color:"#718096", fontSize:"12px"}}>2026-03-13</span>
              </div>
              <div style={{
                background:"white",
                padding:"20px",
                borderRadius:"12px",
                boxShadow:"0 4px 6px rgba(0,0,0,0.1)",
                borderTop:"4px solid #2b6cb0"
              }}>
                <h3 style={{margin:"0 0 10px 0", color:"#2d3748", fontSize:"16px"}}>Port of Mumbai News</h3>
                <p style={{color:"#4a5568", fontSize:"14px", margin:"0 0 10px 0"}}>Record cargo handling in February 2026 shows 15% increase in throughput.</p>
                <span style={{color:"#718096", fontSize:"12px"}}>2026-03-12</span>
              </div>
              <div style={{
                background:"white",
                padding:"20px",
                borderRadius:"12px",
                boxShadow:"0 4px 6px rgba(0,0,0,0.1)",
                borderTop:"4px solid #38a169"
              }}>
                <h3 style={{margin:"0 0 10px 0", color:"#2d3748", fontSize:"16px"}}>AIS System Upgrade</h3>
                <p style={{color:"#4a5568", fontSize:"14px", margin:"0 0 10px 0"}}>AIS tracking system upgrade completed with enhanced real-time capabilities.</p>
                <span style={{color:"#718096", fontSize:"12px"}}>2026-03-11</span>
              </div>
              <div style={{
                background:"white",
                padding:"20px",
                borderRadius:"12px",
                boxShadow:"0 4px 6px rgba(0,0,0,0.1)",
                borderTop:"4px solid #e53e3e"
              }}>
                <h3 style={{margin:"0 0 10px 0", color:"#2d3748", fontSize:"16px"}}>🌧️ Weather & Air Quality</h3>
                {weatherLoading ? (
                  <p style={{color:"#4a5568", fontSize:"14px"}}>Loading weather data...</p>
                ) : (
                  <div>
                    <div style={{marginBottom:"10px"}}>
                      <span style={{color:"#718096", fontSize:"12px"}}>Temperature:</span>
                      <span style={{color:"#2d3748", fontSize:"14px", fontWeight:"bold", marginLeft:"8px"}}>
                        {weather?.temperature_2m}°C
                      </span>
                      <span style={{color:"#718096", fontSize:"12px", marginLeft:"15px"}}>Humidity:</span>
                      <span style={{color:"#2d3748", fontSize:"14px", fontWeight:"bold", marginLeft:"8px"}}>
                        {weather?.relative_humidity_2m}%
                      </span>
                    </div>
                    <div style={{marginBottom:"10px"}}>
                      <span style={{color:"#718096", fontSize:"12px"}}>Wind:</span>
                      <span style={{color:"#2d3748", fontSize:"14px", fontWeight:"bold", marginLeft:"8px"}}>
                        {weather?.wind_speed_10m} km/h
                      </span>
                      <span style={{color:"#718096", fontSize:"12px", marginLeft:"15px"}}>Direction:</span>
                      <span style={{color:"#2d3748", fontSize:"14px", fontWeight:"bold", marginLeft:"8px"}}>
                        {weather?.wind_direction_10m}°
                      </span>
                    </div>
                    <div>
                      <span style={{color:"#718096", fontSize:"12px"}}>Air Quality (AQI):</span>
                      <span style={{color:"#2d3748", fontSize:"14px", fontWeight:"bold", marginLeft:"8px"}}>
                        {airQuality?.us_aqi}
                      </span>
                      <span style={{color:"#718096", fontSize:"12px", marginLeft:"15px"}}>PM2.5:</span>
                      <span style={{color:"#2d3748", fontSize:"14px", fontWeight:"bold", marginLeft:"8px"}}>
                        {airQuality?.pm2_5} μg/m³
                      </span>
                    </div>
                  </div>
                )}
                <span style={{color:"#718096", fontSize:"12px", display:"block", marginTop:"10px"}}>Mumbai, India - Live Data</span>
              </div>
            </div>
          </div>

          {/* Slide 2: Map Section */}
          <div style={{
            width:"100%",
            height:"100%",
            display: currentSlide === 1 ? "block" : "none"
          }}>
            <div style={{width:"100%", height:"100%"}}>
              <VesselMap vessels={vesselArray} center={[CONFIG.latitude, CONFIG.longitude]} zoom={CONFIG.zoom}/>
            </div>
          </div>
          
        </div>

        {/* Carousel Navigation Dots */}
        <div style={{
          display:"flex",
          justifyContent:"center",
          gap:"10px",
          padding:"10px",
          background:"#f0f4f8"
        }}>
          <button 
            onClick={() => setCurrentSlide(0)}
            style={{
              width:"12px",
              height:"12px",
              borderRadius:"50%",
              border:"none",
              cursor:"pointer",
              background: currentSlide === 0 ? "#1a365d" : "#cbd5e0",
              transition: "background 0.3s"
            }}
            aria-label="Show Map"
          />
          <button 
            onClick={() => setCurrentSlide(1)}
            style={{
              width:"12px",
              height:"12px",
              borderRadius:"50%",
              border:"none",
              cursor:"pointer",
              background: currentSlide === 1 ? "#1a365d" : "#cbd5e0",
              transition: "background 0.3s"
            }}
            aria-label="Show News"
          />
        </div>

        {/* BOTTOM ROW - Marquee Text */}
        <div style={{
          background:"#1a365d",
          color:"white",
          padding:"10px 0",
          overflow:"hidden",
          whiteSpace:"nowrap"
        }}>
          <div style={{
            display:"inline-block",
            animation:"marquee 25s linear infinite",
            paddingLeft:"100%"
          }}>
            <span style={{marginRight:"50px", fontSize:"14px"}}>
              ⚓ STAY CONNECTED WITH MARITIME AIS DASHBOARD | 🌊 MONITORING VESSELS IN REAL-TIME | 📍 ALL RIGHTS RESERVED 2026
            </span>
            <span style={{marginRight:"50px", fontSize:"14px"}}>
              🚢 SAFE NAVIGATION IS OUR PRIORITY | AIS TECHNOLOGY FOR BETTER MARITIME SAFETY | 📡 CONTINUOUS TRACKING 24/7
            </span>
          </div>
          <style>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
        </div>

      </div>
    </div>
  )
}
