
import React,{useEffect,useState,useRef} from "react";
import {listenAIS} from "../services/socketService";
import VesselMap from "../components/VesselMap";
import { vesselImages } from "../config/vesselImages";

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

// Weather code to GIF mapping for Open-Meteo weather codes
const getWeatherGif = (weatherCode) => {
  // WMO Weather interpretation codes
  if (weatherCode === 0) return "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif"; // Clear sky
  if (weatherCode >= 1 && weatherCode <= 3) return "https://media.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif"; // Partly cloudy
  if (weatherCode >= 45 && weatherCode <= 48) return "https://media.giphy.com/media/3o7TKSf6gOu6RFUrkC/giphy.gif"; // Fog
  if (weatherCode >= 51 && weatherCode <= 67) return "https://media.giphy.com/media/l0Iy69RBwtdmvwkIo/giphy.gif"; // Drizzle/Rain
  if (weatherCode >= 71 && weatherCode <= 77) return "https://media.giphy.com/media/l0Iyl55kTeh71nTXy/giphy.gif"; // Snow
  if (weatherCode >= 80 && weatherCode <= 82) return "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif"; // Rain showers
  if (weatherCode >= 85 && weatherCode <= 86) return "https://media.giphy.com/media/l0Iyl55kTeh71nTXy/giphy.gif"; // Snow showers
  if (weatherCode >= 95) return "https://media.giphy.com/media/l0HlBO2eyKzSZk0nE/giphy.gif"; // Thunderstorm
  return "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif"; // Default clear
};

// Get AQI status and color
const getAQIStatus = (aqi) => {
  if (aqi <= 50) return { status: "Good", color: "#22c55e" };
  if (aqi <= 100) return { status: "Moderate", color: "#eab308" };
  if (aqi <= 150) return { status: "Unhealthy for Sensitive", color: "#f97316" };
  if (aqi <= 200) return { status: "Unhealthy", color: "#ef4444" };
  if (aqi <= 300) return { status: "Very Unhealthy", color: "#a855f7" };
  return { status: "Hazardous", color: "#7f1d1d" };
};

// Sample shipping news data - can be replaced with API fetch
const sampleShippingNews = [
  { id: 1, title: "Global Container Traffic Reaches Record High in 2026", source: "Maritime Journal", time: "2 hours ago", image: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=100&h=60&fit=crop" },
  { id: 2, title: "New Green Shipping Corridors Announced for Asia-Europe Route", source: "Shipping Watch", time: "4 hours ago", image: "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=100&h=60&fit=crop" },
  { id: 3, title: "Port Automation Trends: AI Transforming Terminal Operations", source: "TradeWinds", time: "6 hours ago", image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100&h=60&fit=crop" },
  { id: 4, title: "IMO 2026 Emissions Standards: Industry Prepares for Compliance", source: "Lloyd's List", time: "8 hours ago", image: "https://images.unsplash.com/photo-1569254821904-34d91231e0c7?w=100&h=60&fit=crop" },
  { id: 5, title: "Container Shipping Rates Stabilize After Year of Volatility", source: "FreightWaves", time: "10 hours ago", image: "https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=100&h=60&fit=crop" },
  { id: 6, title: "Major Cruise Line Expands Operations in Indian Ocean Region", source: "Cruise Industry News", time: "12 hours ago", image: "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=100&h=60&fit=crop" },
  { id: 7, title: "Offshore Wind Farm Projects Drive New Vessel Demand", source: "Renewable Energy Marine", time: "14 hours ago", image: "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=100&h=60&fit=crop" },
  { id: 8, title: "Digital Twin Technology Revolutionizing Ship Navigation", source: "Marine Technology News", time: "16 hours ago", image: "https://images.unsplash.com/photo-1559825481-12a05cc00344?w=100&h=60&fit=crop" },
  { id: 9, title: "Bulk Carrier Fleet Growth Expected to Slow in 2026", source: "Baltic Exchange", time: "18 hours ago", image: "https://images.unsplash.com/photo-1583267318076-7c14406f2c9b?w=100&h=60&fit=crop" },
  { id: 10, title: "Smart Port Infrastructure Investments Hit New Record", source: "Port Strategy", time: "20 hours ago", image: "https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?w=100&h=60&fit=crop" }
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
  const [currentPhotoSlide, setCurrentPhotoSlide] = useState(0);
  const [vesselPhotos, setVesselPhotos] = useState([]);
  const [randomPhotoOrder, setRandomPhotoOrder] = useState([]);
  const [weather, setWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [shippingNews, setShippingNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [apiVessels, setApiVessels] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const newsScrollRef = useRef(null);

  useEffect(()=>{
    listenAIS(updateVessel);
  },[]);

  // Fetch vessel data from Python API
  useEffect(() => {
    const fetchApiVessels = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/vessels');
        const data = await response.json();
        if (Array.isArray(data)) {
          setApiVessels(data);
        }
      } catch (error) {
        console.error('Error fetching vessel data from API:', error);
      }
    };
    fetchApiVessels();
    // Refresh every 30 seconds
    const interval = setInterval(fetchApiVessels, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update current time every second for world clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      setCurrentSlide(prev => (prev === 2 ? 0 : prev + 1));
    }, 420000);
    return () => clearInterval(interval);
  }, []);

  // Load vessel photos from images folder and set up random slideshow
  useEffect(() => {
    // Use images from config - users can customize in client/src/config/vesselImages.js
    const vesselImagesList = vesselImages;
    
    setVesselPhotos(vesselImagesList);
    
    // Create random order for slideshow
    const shuffled = [...vesselImagesList].sort(() => Math.random() - 0.5);
    setRandomPhotoOrder(shuffled);
    
    // Auto-advance photo carousel every 4 seconds for random slideshow feel
    const photoInterval = setInterval(() => {
      setCurrentPhotoSlide(prev => {
        const totalPhotos = shuffled.length;
        // Random jump to create unpredictable feel
        const randomJump = Math.floor(Math.random() * 3) + 1;
        return (prev + randomJump) % totalPhotos;
      });
    }, 4000);
    
    return () => clearInterval(photoInterval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide(prev => (prev === 2 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? 2 : prev - 1));
  };

  const nextPhotoSlide = () => {
    setCurrentPhotoSlide(prev => {
      const totalPhotos = randomPhotoOrder.length;
      return (prev + 1) % totalPhotos;
    });
  };

  const prevPhotoSlide = () => {
    setCurrentPhotoSlide(prev => {
      const totalPhotos = randomPhotoOrder.length;
      return prev === 0 ? totalPhotos - 1 : prev - 1;
    });
  };

  return(
    <div style={{display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden"}}>
      
      {/* TOP ROW - Marquee Text with API Vessel Data */}
      <div style={{
        background:"#1a365d",
        color:"white",
        padding:"10px 0",
        overflow:"hidden",
        whiteSpace:"nowrap"
      }}>
        <div style={{
          display:"inline-block",
          animation:"marquee 120s linear infinite",
          paddingLeft:"100%"
        }}>
          {apiVessels.length > 0 ? (
            apiVessels.slice(0, 10).map((vessel, index) => (
              <span key={index} style={{marginRight:"50px", fontSize:"16px", fontWeight:"bold"}}>
                🚢 {vessel.vessel || 'N/A'} | {vessel.position || '-'} | {vessel.port || '-'} | ETA: {vessel.eta || '-'} | NPOC: {vessel.npoc || '-'}
              </span>
            ))
          ) : (
            <>
              <span style={{marginRight:"50px", fontSize:"16px", fontWeight:"bold"}}>
                🚢 MARITIME AIS DASHBOARD - VESSEL TRACKING SYSTEM 
              </span>
              <span style={{marginRight:"50px", fontSize:"16px", fontWeight:"bold"}}>
                📡 LIVE SHIP POSITIONS | PORT STATUS | WEATHER UPDATES 
              </span>
              <span style={{marginRight:"50px", fontSize:"16px", fontWeight:"bold"}}>
                ⚓ TOTAL VESSELS TRACKED: {vesselArray.length} | STAY SAFE AT SEA
              </span>
            </>
          )}
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
            
            {/* All Cards in Equal Width Responsive Grid - 3 columns */}
            <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))", gap:"20px", height:"100%"}}>
              {/* Shipping News Card - Widget Style with Thumbnails */}
              <div style={{
                background:"linear-gradient(135deg, #1a365d 0%, #2c5282 100%)",
                borderRadius:"16px",
                boxShadow:"0 10px 25px rgba(0,0,0,0.3)",
                overflow:"hidden",
                height:"100%",
                display:"flex",
                flexDirection:"column"
              }}>
                <div style={{
                  padding:"20px 25px",
                  borderBottom:"1px solid rgba(255,255,255,0.1)",
                  display:"flex",
                  justifyContent:"space-between",
                  alignItems:"center",
                  background:"rgba(0,0,0,0.1)"
                }}>
                  <h3 style={{margin:0, color:"white", fontSize:"20px", fontWeight:"600", display:"flex", alignItems:"center", gap:"10px"}}>
                    📰 Latest Shipping News
                  </h3>
                  <span style={{color:"rgba(255,255,255,0.7)", fontSize:"12px", background:"rgba(255,255,255,0.1)", padding:"4px 12px", borderRadius:"20px"}}>Live Updates</span>
                </div>
                <div style={{
                  flex:1,
                  overflow:"hidden",
                  position:"relative"
                }}>
                  {/* Continuous Scrolling News Container */}
                  <div 
                    ref={newsScrollRef}
                    style={{
                      animation: `scrollNews ${shippingNews.length * 10}s linear infinite`,
                    }}
                  >
                    {newsLoading ? (
                      <div style={{padding:"30px", color:"rgba(255,255,255,0.8)", textAlign:"center"}}>Loading shipping news...</div>
                    ) : (
                      <>
                        {/* Duplicate news items for seamless looping */}
                        {[...shippingNews, ...shippingNews].map((news, index) => (
                          <div 
                            key={`${news.id}-${index}`}
                            style={{
                              padding:"15px 25px",
                              borderBottom:"1px solid rgba(255,255,255,0.1)",
                              display:"flex",
                              alignItems:"center",
                              gap:"15px",
                              transition:"background 0.3s",
                              cursor:"pointer"
                            }}
                          >
                            {/* Thumbnail Image */}
                            <img 
                              src={news.image || "https://images.unsplash.com/photo-1583267318076-7c14406f2c9b?w=100&h=60&fit=crop"} 
                              alt="News thumbnail"
                              style={{
                                width: "clamp(60px, 15vw, 100px)", 
                                height: "clamp(40px, 10vw, 60px)", 
                                borderRadius: "8px",
                                objectFit: "cover",
                                flexShrink: 0,
                                border: "2px solid rgba(255,255,255,0.2)"
                              }}
                            />
                            <div style={{flex:1, minWidth: 0}}>
                              <span style={{color:"white", fontSize:"15px", fontWeight:"500", lineHeight:"1.4", display:"block"}}>
                                {news.title}
                              </span>
                              <div style={{marginTop:"6px", display:"flex", gap:"15px"}}>
                                <span style={{color:"rgba(255,255,255,0.6)", fontSize:"12px"}}>📰 {news.source}</span>
                                <span style={{color:"rgba(255,255,255,0.6)", fontSize:"12px"}}>🕐 {news.time}</span>
                              </div>
                            </div>
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
                background:"linear-gradient(135deg, #c05621 0%, #dd6b20 100%)",
                padding:"20px",
                borderRadius:"16px",
                boxShadow:"0 10px 25px rgba(0,0,0,0.3)",
                height:"100%",
                color:"white"
              }}>
                <h3 style={{margin:"0 0 10px 0", fontSize:"20px", fontWeight:"600", display:"flex", alignItems:"center", gap:"10px"}}>
                  ⚠️ Maritime Safety Alert
                </h3>
                <p style={{color:"rgba(255,255,255,0.9)", fontSize:"15px", margin:"0 0 15px 0", lineHeight:"1.5"}}>New safety regulations effective 2026 for all vessels operating in Indian waters. All captains must comply with updated AIS requirements.</p>
                <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
                  <span style={{color:"rgba(255,255,255,0.7)", fontSize:"13px", background:"rgba(0,0,0,0.2)", padding:"6px 12px", borderRadius:"20px"}}>📅 2026-03-13</span>
                  <span style={{color:"rgba(255,255,255,0.7)", fontSize:"13px", background:"rgba(0,0,0,0.2)", padding:"6px 12px", borderRadius:"20px"}}>🔔 Important</span>
                </div>
              </div>
              {/* Port of Mumbai News card - commented out
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
              */}
              {/* Vessel Statistics card - commented out
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
              */}
              {/* Weather Card - Added to grid */}
              <div style={{
                background:"linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0ea5e9 100%)",
                padding:"20px",
                borderRadius:"16px",
                boxShadow:"0 10px 25px rgba(0,0,0,0.3)",
                height:"100%",
                color:"white"
              }}>
                <h3 style={{margin:"0 0 15px 0", fontSize:"18px", fontWeight:"600", display:"flex", alignItems:"center", gap:"8px"}}>
                  🌊 Live Weather & Air Quality
                </h3>
                {weatherLoading ? (
                  <p style={{color:"rgba(255,255,255,0.8)", fontSize:"14px"}}>Loading weather data...</p>
                ) : (
                  <div>
                    {/* Weather GIF and Temperature */}
                    <div style={{display:"flex", alignItems:"center", marginBottom:"20px", background:"rgba(255,255,255,0.2)", borderRadius:"12px", padding:"15px", flexWrap:"wrap", gap:"10px"}}>
                      <img 
                        src={getWeatherGif(weather?.weather_code)} 
                        alt="Weather" 
                        style={{width:"clamp(50px, 15vw, 80px)", height:"clamp(50px, 15vw, 80px)", borderRadius:"50%", objectFit:"cover", border:"3px solid rgba(255,255,255,0.5)"}}
                      />
                      <div>
                        <div style={{fontSize:"36px", fontWeight:"bold", lineHeight:"1"}}>
                          {weather?.temperature_2m}°C
                        </div>
                        <div style={{fontSize:"12px", opacity: 0.9, marginTop:"5px"}}>📍 Mumbai Port Area</div>
                      </div>
                    </div>
                    
                    {/* Weather Details Grid */}
                    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"15px"}}>
                      <div style={{background:"rgba(255,255,255,0.15)", borderRadius:"10px", padding:"12px", textAlign:"center", border:"1px solid rgba(255,255,255,0.1)"}}>
                        <div style={{fontSize:"20px", marginBottom:"5px"}}>💧</div>
                        <div style={{fontSize:"11px", opacity: 0.7}}>Humidity</div>
                        <div style={{fontSize:"16px", fontWeight:"bold"}}>{weather?.relative_humidity_2m}%</div>
                      </div>
                      <div style={{background:"rgba(255,255,255,0.15)", borderRadius:"10px", padding:"12px", textAlign:"center", border:"1px solid rgba(255,255,255,0.1)"}}>
                        <div style={{fontSize:"20px", marginBottom:"5px"}}>💨</div>
                        <div style={{fontSize:"11px", opacity: 0.7}}>Wind Speed</div>
                        <div style={{fontSize:"16px", fontWeight:"bold"}}>{weather?.wind_speed_10m} km/h</div>
                      </div>
                      <div style={{background:"rgba(255,255,255,0.15)", borderRadius:"10px", padding:"12px", textAlign:"center", border:"1px solid rgba(255,255,255,0.1)"}}>
                        <div style={{fontSize:"20px", marginBottom:"5px"}}>🧭</div>
                        <div style={{fontSize:"11px", opacity: 0.7}}>Wind Direction</div>
                        <div style={{fontSize:"16px", fontWeight:"bold"}}>{weather?.wind_direction_10m}°</div>
                      </div>
                      <div style={{background:"rgba(255,255,255,0.15)", borderRadius:"10px", padding:"12px", textAlign:"center", border:"1px solid rgba(255,255,255,0.1)"}}>
                        <div style={{fontSize:"20px", marginBottom:"5px"}}>🌬️</div>
                        <div style={{fontSize:"11px", opacity: 0.7}}>Air Quality</div>
                        <div style={{fontSize:"16px", fontWeight:"bold", color: getAQIStatus(airQuality?.us_aqi).color}}>{airQuality?.us_aqi}</div>
                      </div>
                    </div>
                    
                    {/* AQI Status Bar */}
                    <div style={{background:"rgba(255,255,255,0.25)", borderRadius:"10px", padding:"12px", border:"1px solid rgba(255,255,255,0.2)"}}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px"}}>
                        <span style={{fontSize:"12px", fontWeight:"600", color:"white"}}>Air Quality Index:</span>
                        <span style={{fontSize:"12px", fontWeight:"bold", color: getAQIStatus(airQuality?.us_aqi).color, background:"white", padding:"2px 10px", borderRadius:"12px", boxShadow:"0 2px 4px rgba(0,0,0,0.2)"}}>
                          {getAQIStatus(airQuality?.us_aqi).status}
                        </span>
                      </div>
                      <div style={{display:"flex", gap:"4px", marginBottom:"5px"}}>
                        <div style={{flex:1, height:"8px", background:"#22c55e", borderRadius:"4px", opacity: airQuality?.us_aqi <= 50 ? 1 : 0.2}}></div>
                        <div style={{flex:1, height:"8px", background:"#eab308", borderRadius:"4px", opacity: airQuality?.us_aqi > 50 && airQuality?.us_aqi <= 100 ? 1 : 0.2}}></div>
                        <div style={{flex:1, height:"8px", background:"#f97316", borderRadius:"4px", opacity: airQuality?.us_aqi > 100 && airQuality?.us_aqi <= 150 ? 1 : 0.2}}></div>
                        <div style={{flex:1, height:"8px", background:"#ef4444", borderRadius:"4px", opacity: airQuality?.us_aqi > 150 && airQuality?.us_aqi <= 200 ? 1 : 0.2}}></div>
                        <div style={{flex:1, height:"8px", background:"#a855f7", borderRadius:"4px", opacity: airQuality?.us_aqi > 200 ? 1 : 0.2}}></div>
                      </div>
                      <div style={{display:"flex", justifyContent:"space-between", fontSize:"9px", opacity: 0.6}}>
                        <span>Good</span><span>Moderate</span><span>Unhealthy</span><span>Very</span><span>Hazardous</span>
                      </div>
                    </div>
                    
                    {/* World Clock Analog */}
                    <div style={{marginTop:"15px", background:"rgba(255,255,255,0.15)", borderRadius:"10px", padding:"12px", border:"1px solid rgba(255,255,255,0.1)"}}>
                      <div style={{fontSize:"12px", fontWeight:"600", marginBottom:"10px", textAlign:"center"}}>🌐 World Clock</div>
                      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"8px"}}>
                        {/* Mumbai */}
                        <div style={{textAlign:"center"}}>
                          <div style={{width:"36px", height:"36px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.5)", margin:"0 auto 5px", position:"relative", background:"rgba(255,255,255,0.1)"}}>
                            <div style={{position:"absolute", top:"50%", left:"50%", width:"2px", height:"12px", background:"white", transformOrigin:"bottom center", transform:"translate(-50%, -100%) rotate(" + ((currentTime.getHours() + 5.5) % 24 * 30 + currentTime.getMinutes() * 0.5) + "deg)"}}></div>
                            <div style={{position:"absolute", top:"50%", left:"50%", width:"1px", height:"14px", background:"#fbbf24", transformOrigin:"bottom center", transform:"translate(-50%, -100%) rotate(" + (currentTime.getMinutes() * 6 + currentTime.getSeconds() * 0.1) + "deg)"}}></div>
                          </div>
                          <div style={{fontSize:"10px", opacity: 0.8}}>Mumbai</div>
                          <div style={{fontSize:"11px", fontWeight:"bold"}}>{new Date(currentTime.getTime()).toLocaleTimeString('en-US', {timeZone: 'Asia/Kolkata', hour: '2-digit', minute:'2-digit', hour12: false})}</div>
                        </div>
                        {/* London (UK) */}
                        <div style={{textAlign:"center"}}>
                          <div style={{width:"36px", height:"36px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.5)", margin:"0 auto 5px", position:"relative", background:"rgba(255,255,255,0.1)"}}>
                            <div style={{position:"absolute", top:"50%", left:"50%", width:"2px", height:"12px", background:"white", transformOrigin:"bottom center", transform:"translate(-50%, -100%) rotate(" + ((currentTime.getUTCHours() + 0) % 24 * 30 + currentTime.getUTCMinutes() * 0.5) + "deg)"}}></div>
                            <div style={{position:"absolute", top:"50%", left:"50%", width:"1px", height:"14px", background:"#fbbf24", transformOrigin:"bottom center", transform:"translate(-50%, -100%) rotate(" + (currentTime.getUTCMinutes() * 6 + currentTime.getUTCSeconds() * 0.1) + "deg)"}}></div>
                          </div>
                          <div style={{fontSize:"10px", opacity: 0.8}}>London</div>
                          <div style={{fontSize:"11px", fontWeight:"bold"}}>{new Date(currentTime.getTime()).toLocaleTimeString('en-US', {timeZone: 'Europe/London', hour: '2-digit', minute:'2-digit', hour12: false})}</div>
                        </div>
                        {/* New York (USA) */}
                        <div style={{textAlign:"center"}}>
                          <div style={{width:"36px", height:"36px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.5)", margin:"0 auto 5px", position:"relative", background:"rgba(255,255,255,0.1)"}}>
                            <div style={{position:"absolute", top:"50%", left:"50%", width:"2px", height:"12px", background:"white", transformOrigin:"bottom center", transform:"translate(-50%, -100%) rotate(" + ((currentTime.getUTCHours() - 5 + 24) % 24 * 30 + currentTime.getUTCMinutes() * 0.5) + "deg)"}}></div>
                            <div style={{position:"absolute", top:"50%", left:"50%", width:"1px", height:"14px", background:"#fbbf24", transformOrigin:"bottom center", transform:"translate(-50%, -100%) rotate(" + (currentTime.getUTCMinutes() * 6 + currentTime.getUTCSeconds() * 0.1) + "deg)"}}></div>
                          </div>
                          <div style={{fontSize:"10px", opacity: 0.8}}>New York</div>
                          <div style={{fontSize:"11px", fontWeight:"bold"}}>{new Date(currentTime.getTime()).toLocaleTimeString('en-US', {timeZone: 'America/New_York', hour: '2-digit', minute:'2-digit', hour12: false})}</div>
                        </div>
                        {/* Tokyo */}
                        <div style={{textAlign:"center"}}>
                          <div style={{width:"36px", height:"36px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.5)", margin:"0 auto 5px", position:"relative", background:"rgba(255,255,255,0.1)"}}>
                            <div style={{position:"absolute", top:"50%", left:"50%", width:"2px", height:"12px", background:"white", transformOrigin:"bottom center", transform:"translate(-50%, -100%) rotate(" + ((currentTime.getUTCHours() + 9) % 24 * 30 + currentTime.getUTCMinutes() * 0.5) + "deg)"}}></div>
                            <div style={{position:"absolute", top:"50%", left:"50%", width:"1px", height:"14px", background:"#fbbf24", transformOrigin:"bottom center", transform:"translate(-50%, -100%) rotate(" + (currentTime.getUTCMinutes() * 6 + currentTime.getUTCSeconds() * 0.1) + "deg)"}}></div>
                          </div>
                          <div style={{fontSize:"10px", opacity: 0.8}}>Tokyo</div>
                          <div style={{fontSize:"11px", fontWeight:"bold"}}>{new Date(currentTime.getTime()).toLocaleTimeString('en-US', {timeZone: 'Asia/Tokyo', hour: '2-digit', minute:'2-digit', hour12: false})}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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

          {/* Slide 2: Vessel Photos */}
          <div style={{
            width:"100%",
            height:"100%",
            overflow:"auto",
            background:"linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #1a365d 100%)",
            padding:"20px",
            display: currentSlide === 2 ? "block" : "none"
          }}>
            <h2 style={{color:"white", marginBottom:"20px", borderBottom:"2px solid rgba(255,255,255,0.3)", paddingBottom:"10px", display:"flex", alignItems:"center", gap:"10px"}}>
              🚢 Vessel Photos
            </h2>
            
            {/* Nested Photo Carousel with Random Slideshow Feel */}
            <div style={{
              background:"rgba(0,0,0,0.3)",
              borderRadius:"20px",
              padding:"20px",
              boxShadow:"0 10px 30px rgba(0,0,0,0.5)"
            }}>
              {/* Main Photo Display */}
              <div style={{
                position:"relative",
                width:"100%",
                maxHeight:"65vh",
                minHeight:"300px",
                borderRadius:"15px",
                overflow:"hidden",
                boxShadow:"0 8px 25px rgba(0,0,0,0.4)"
              }}>
                {/* Photo Slide Animation */}
                <div style={{
                  width:"100%",
                  height:"100%",
                  transition:"transform 0.5s ease-in-out, opacity 0.5s ease-in-out",
                  transform: `translateX(0)`,
                  opacity: 1
                }}>
                  {randomPhotoOrder.length > 0 && randomPhotoOrder[currentPhotoSlide] && (
                    <>
                      <img 
                        src={randomPhotoOrder[currentPhotoSlide].src} 
                        alt={randomPhotoOrder[currentPhotoSlide].title}
                        style={{
                          width:"100%",
                          height:"auto",
                          maxHeight:"65vh",
                          objectFit:"contain",
                          objectPosition:"center"
                        }}
                      />
                      {/* Photo Overlay */}
                      <div style={{
                        position:"absolute",
                        bottom:0,
                        left:0,
                        right:0,
                        background:"linear-gradient(transparent, rgba(0,0,0,0.8))",
                        padding:"30px 20px 20px",
                        color:"white"
                      }}>
                        <h3 style={{margin:0, fontSize:"clamp(16px, 3vw, 24px)", fontWeight:"bold"}}>
                          {randomPhotoOrder[currentPhotoSlide].title}
                        </h3>
                        <p style={{margin:"5px 0 0", fontSize:"clamp(12px, 2vw, 16px)", opacity:0.9}}>
                          🚢 {randomPhotoOrder[currentPhotoSlide].vessel}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Previous Button */}
                <button
                  onClick={prevPhotoSlide}
                  style={{
                    position:"absolute",
                    left:"15px",
                    top:"50%",
                    transform:"translateY(-50%)",
                    background:"rgba(0,0,0,0.6)",
                    border:"none",
                    borderRadius:"50%",
                    width:"clamp(35px, 6vw, 50px)",
                    height:"clamp(35px, 6vw, 50px)",
                    cursor:"pointer",
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    color:"white",
                    fontSize:"clamp(16px, 3vw, 24px)",
                    transition:"background 0.3s, transform 0.3s",
                    zIndex:10
                  }}
                  onMouseOver={(e) => {e.target.style.background = "rgba(0,0,0,0.8)"; e.target.style.transform = "translateY(-50%) scale(1.1)";}}
                  onMouseOut={(e) => {e.target.style.background = "rgba(0,0,0,0.6)"; e.target.style.transform = "translateY(-50%) scale(1)";}}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                
                {/* Next Button */}
                <button
                  onClick={nextPhotoSlide}
                  style={{
                    position:"absolute",
                    right:"15px",
                    top:"50%",
                    transform:"translateY(-50%)",
                    background:"rgba(0,0,0,0.6)",
                    border:"none",
                    borderRadius:"50%",
                    width:"clamp(35px, 6vw, 50px)",
                    height:"clamp(35px, 6vw, 50px)",
                    cursor:"pointer",
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    color:"white",
                    fontSize:"clamp(16px, 3vw, 24px)",
                    transition:"background 0.3s, transform 0.3s",
                    zIndex:10
                  }}
                  onMouseOver={(e) => {e.target.style.background = "rgba(0,0,0,0.8)"; e.target.style.transform = "translateY(-50%) scale(1.1)";}}
                  onMouseOut={(e) => {e.target.style.background = "rgba(0,0,0,0.6)"; e.target.style.transform = "translateY(-50%) scale(1)";}}
                  aria-label="Next photo"
                >
                  ›
                </button>
                
                {/* Slideshow Indicator */}
                <div style={{
                  position:"absolute",
                  top:"15px",
                  right:"15px",
                  background:"rgba(0,0,0,0.6)",
                  padding:"8px 15px",
                  borderRadius:"20px",
                  color:"white",
                  fontSize:"12px",
                  display:"flex",
                  alignItems:"center",
                  gap:"8px"
                }}>
                  <span>🎲</span>
                </div>
              </div>
              
              {/* Photo Thumbnails Strip - Hidden */}
              <div style={{
                display: "none"
              }}>
                {randomPhotoOrder.map((photo, index) => (
                  <div 
                    key={photo.id}
                    onClick={() => setCurrentPhotoSlide(index)}
                    style={{
                      flexShrink:0,
                      width:"clamp(60px, 12vw, 100px)",
                      height:"clamp(40px, 8vw, 65px)",
                      borderRadius:"8px",
                      overflow:"hidden",
                      cursor:"pointer",
                      border: currentPhotoSlide === index ? "3px solid #fbbf24" : "3px solid transparent",
                      opacity: currentPhotoSlide === index ? 1 : 0.6,
                      transition:"all 0.3s ease"
                    }}
                  >
                    <img 
                      src={photo.src} 
                      alt={photo.title}
                      style={{
                        width:"100%",
                        height:"100%",
                        objectFit:"cover"
                      }}
                    />
                  </div>
                ))}
              </div>
              

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
          <button 
            onClick={() => setCurrentSlide(2)}
            style={{
              width:"12px",
              height:"12px",
              borderRadius:"50%",
              border:"none",
              cursor:"pointer",
              background: currentSlide === 2 ? "#1a365d" : "#cbd5e0",
              transition: "background 0.3s"
            }}
            aria-label="Show Vessel Photos"
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
