
import React,{useEffect,useState,useRef} from "react";
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

// Free maritime/shipping news API - using sample data with API fetch capability
// To use a real API, sign up at https://newsdata.io or https://gnews.io and add your API key
const SHIPPING_NEWS_API = process.env.REACT_APP_SHIPPING_NEWS_API || "";

// Sample shipping news data - can be replaced with API fetch
const sampleShippingNews = [
  { id: 1, title: "Global Container Traffic Reaches Record High in 2026", source: "Maritime Journal", time: "2 hours ago" },
  { id: 2, title: "New Green Shipping Corridors Announced for Asia-Europe Route", source: "Shipping Watch", time: "4 hours ago" },
  { id: 3, title: "Port Automation Trends: AI Transforming Terminal Operations", source: "TradeWinds", time: "6 hours ago" },
  { id: 4, title: "IMO 2026 Emissions Standards: Industry Prepares for Compliance", source: "Lloyd's List", time: "8 hours ago" },
  { id: 5, title: "Container Shipping Rates Stabilize After Year of Volatility", source: "FreightWaves", time: "10 hours ago" },
  { id: 6, title: "Major Cruise Line Expands Operations in Indian Ocean Region", source: "Cruise Industry News", time: "12 hours ago" },
  { id: 7, title: "Offshore Wind Farm Projects Drive New Vessel Demand", source: "Renewable Energy Marine", time: "14 hours ago" },
  { id: 8, title: "Digital Twin Technology Revolutionizing Ship Navigation", source: "Marine Technology News", time: "16 hours ago" },
  { id: 9, title: "Bulk Carrier Fleet Growth Expected to Slow in 2026", source: "Baltic Exchange", time: "18 hours ago" },
  { id: 10, title: "Smart Port Infrastructure Investments Hit New Record", source: "Port Strategy", time: "20 hours ago" }
];

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
  const [shippingNews, setShippingNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const newsScrollRef = useRef(null);

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

  // Fetch shipping news from API or use sample data
  useEffect(() => {
    const fetchShippingNews = async () => {
      try {
        if (SHIPPING_NEWS_API) {
          // Use real API if API key is provided
          const response = await fetch(
            `https://newsdata.io/api/1/news?apikey=${SHIPPING_NEWS_API}&q=shipping%20OR%20maritime%20OR%20port&language=en&size=10`
          );
          const data = await response.json();
          if (data.results) {
            const formattedNews = data.results.map((item, index) => ({
              id: index,
              title: item.title || "No title",
              source: item.source_id || "Unknown",
              time: item.pubDate ? new Date(item.pubDate).toLocaleTimeString() : "Just now"
            }));
            setShippingNews(formattedNews);
          }
        } else {
          // Use sample data when no API key is provided
          setShippingNews(sampleShippingNews);
        }
        setNewsLoading(false);
      } catch (error) {
        console.error("Error fetching shipping news:", error);
        setShippingNews(sampleShippingNews);
        setNewsLoading(false);
      }
    };

    fetchShippingNews();
  }, []);

  // Auto-advance carousel every 7 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev === 1 ? 0 : prev + 1));
    }, 420000);
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
            
            {/* All Cards in Equal Width Grid */}
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:"20px"}}>
              {/* Shipping News Card with Continuous Vertical Scrolling */}
              <div style={{
                background:"white",
                borderRadius:"12px",
                boxShadow:"0 4px 6px rgba(0,0,0,0.1)",
                borderTop:"4px solid #805ad5",
                overflow:"hidden"
              }}>
                <div style={{
                  padding:"15px 20px",
                  borderBottom:"1px solid #e2e8f0",
                  display:"flex",
                  justifyContent:"space-between",
                  alignItems:"center"
                }}>
                  <h3 style={{margin:0, color:"#2d3748", fontSize:"16px"}}>🚢 Latest Shipping News</h3>
                  <span style={{color:"#718096", fontSize:"12px"}}>Continuous scrolling</span>
                </div>
                <div style={{
                  height:"200px",
                  overflow:"hidden",
                  position:"relative"
                }}>
                  {/* Continuous Scrolling News Container */}
                  <div 
                    ref={newsScrollRef}
                    style={{
                      animation: `scrollNews ${shippingNews.length * 8}s linear infinite`,
                    }}
                  >
                    {newsLoading ? (
                      <div style={{padding:"20px", color:"#718096"}}>Loading shipping news...</div>
                    ) : (
                      <>
                        {/* Duplicate news items for seamless looping */}
                        {[...shippingNews, ...shippingNews].map((news, index) => (
                          <div 
                            key={`${news.id}-${index}`}
                            style={{
                              padding:"12px 20px",
                              borderBottom:"1px solid #edf2f7",
                              display:"flex",
                              justifyContent:"space-between",
                              alignItems:"center"
                            }}
                          >
                            <div style={{flex:1}}>
                              <span style={{color:"#2d3748", fontSize:"14px"}}>
                                {news.title}
                              </span>
                              <div style={{marginTop:"4px"}}>
                                <span style={{color:"#718096", fontSize:"11px"}}>{news.source}</span>
                              </div>
                            </div>
                            <span style={{color:"#a0aec0", fontSize:"10px", whiteSpace:"nowrap", marginLeft:"10px"}}>
                              {news.time}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <style>{`
                  @keyframes scrollNews {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-50%); }
                  }
                `}</style>
              </div>
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
              {/* AIS System Upgrade card removed - replaced with Vessel Statistics */}
              <div style={{
                background:"white",
                padding:"20px",
                borderRadius:"12px",
                boxShadow:"0 4px 6px rgba(0,0,0,0.1)",
                borderTop:"4px solid #38a169"
              }}>
                <h3 style={{margin:"0 0 10px 0", color:"#2d3748", fontSize:"16px"}}>📊 Vessel Statistics</h3>
                <div style={{marginBottom:"10px"}}>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:"8px"}}>
                    <span style={{color:"#718096", fontSize:"12px"}}>Total Vessels Tracked:</span>
                    <span style={{color:"#2d3748", fontSize:"14px", fontWeight:"bold"}}>{vesselArray.length}</span>
                  </div>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:"8px"}}>
                    <span style={{color:"#718096", fontSize:"12px"}}>Active in Region:</span>
                    <span style={{color:"#2d3748", fontSize:"14px", fontWeight:"bold"}}>{vesselArray.filter(v => v.speed > 0).length}</span>
                  </div>
                  <div style={{display:"flex", justifyContent:"space-between"}}>
                    <span style={{color:"#718096", fontSize:"12px"}}>At Anchor/Moored:</span>
                    <span style={{color:"#2d3748", fontSize:"14px", fontWeight:"bold"}}>{vesselArray.filter(v => v.speed === 0).length}</span>
                  </div>
                </div>
                <span style={{color:"#718096", fontSize:"12px"}}>Live Tracking</span>
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
