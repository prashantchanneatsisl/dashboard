
import React,{useEffect,useState,useRef} from "react";
import {listenAIS} from "../services/socketService";
import VesselMap from "../components/VesselMap";
import VesselSidebar from "../components/VesselSidebar";
import GridOverlay from "../components/GridOverlay";
import { vesselImages } from "../config/vesselImages";



// Configuration - can be overridden via environment variables
const CONFIG = {
  // Default location: Marol, Andheri, Mumbai
  latitude: parseFloat(process.env.REACT_APP_DEFAULT_LAT || "19.1136"),
  longitude: parseFloat(process.env.REACT_APP_DEFAULT_LON || "72.8697"),
  zoom: parseInt(process.env.REACT_APP_DEFAULT_ZOOM || "6", 10),
  // Weather refresh interval in milliseconds (default 10 minutes)
  weatherRefreshInterval: parseInt(process.env.REACT_APP_WEATHER_REFRESH_MIN || "10", 10) * 60000,
  // Marquee top speed control (milliseconds, default 248000 = 248s)
  marqueeTopDuration: parseInt(process.env.REACT_APP_MARQUEE_TOP_SPEED || "248000", 10),
  // Marquee bottom speed control (milliseconds, default 25000 = 25s)
  marqueeBottomDuration: parseInt(process.env.REACT_APP_MARQUEE_BOTTOM_SPEED || "25000", 10),
  // Carousel slide transition timer (milliseconds, default 45000 = 45s)
  carouselSlideInterval: parseInt(process.env.REACT_APP_CAROUSEL_SLIDE_INTERVAL || "45000", 10),
  // Photo carousel interval (milliseconds, default 4000 = 4s)
  photoCarouselInterval: parseInt(process.env.REACT_APP_PHOTO_CAROUSEL_INTERVAL || "4000", 10)
};

// Free maritime/shipping news API - using newsdata.io
// API Key: pub_ad359a3fbb1644f6a9c20b970bf8c5f5
const SHIPPING_NEWS_API_KEY = process.env.REACT_APP_SHIPPING_NEWS_API_KEY || "pub_ad359a3fbb1644f6a9c20b970bf8c5f5";

const SAMPLE_SHIPPING_NEWS = [
  { id: 1, title: "Global Maritime Trade Recovery Continues in 2026", source: "Maritime News", link: "#", time: "2 hours ago" },
  { id: 2, title: "New Environmental Regulations Impact Container Shipping", source: "Shipping Weekly", link: "#", time: "4 hours ago" },
  { id: 3, title: "Port Automation Trends Reshape Logistics Industry", source: "Maritime Times", link: "#", time: "6 hours ago" },
  { id: 4, title: "Oil Tanker Rates Surge Amid Supply Chain Changes", source: "Trade Winds", link: "#", time: "8 hours ago" },
  { id: 5, title: "Major Shipping Lines Announce New Route Services", source: "Maritime News", link: "#", time: "12 hours ago" },
];

// Format time from newsdata.io pubDate
const formatTime = (pubDate) => {
  if (!pubDate) return "Recently";
  try {
    const date = new Date(pubDate);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return "Recently";
  }
};

// Weather code to emoji mapping for Open-Meteo weather codes
const getWeatherEmoji = (weatherCode) => {
  // WMO Weather interpretation codes
  if (weatherCode === 0) return "☀️"; // Clear sky
  if (weatherCode >= 1 && weatherCode <= 3) return "⛅"; // Partly cloudy
  if (weatherCode >= 45 && weatherCode <= 48) return "🌫️"; // Fog
  if (weatherCode >= 51 && weatherCode <= 67) return "🌧️"; // Drizzle/Rain
  if (weatherCode >= 71 && weatherCode <= 77) return "❄️"; // Snow
  if (weatherCode >= 80 && weatherCode <= 82) return "🌦️"; // Rain showers
  if (weatherCode >= 85 && weatherCode <= 86) return "🌨️"; // Snow showers
  if (weatherCode >= 95) return "⛈️"; // Thunderstorm
  return "☀️"; // Default clear
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

  const [selectedVessel, setSelectedVessel] = useState(null);
const [showSidebar, setShowSidebar] = useState(false);
const [mapReady, setMapReady] = useState(null);
// NEW
const iframeRef = useRef(null);
const [iframeLoaded, setIframeLoaded] = useState(false);

const newsScrollRef = useRef(null);

  const silverJubileeDate = new Date('2027-05-02T00:00:00');
  const [jubileeTimeLeft, setJubileeTimeLeft] = useState({});

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = silverJubileeDate - now;
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        
        setJubileeTimeLeft({ days, hours, minutes, seconds });
      } else {
        setJubileeTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, completed: true });
      }
    };
    
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMapReady = (map) => {
    setMapReady(map);
  };

  useEffect(()=>{
    listenAIS(updateVessel);
  },[]);

  // Preload iframe immediately
useEffect(() => {
  if (iframeRef.current) {
    iframeRef.current.src =
      "https://otis.stratumfive.com/viewer/viewer2.aspx?token=6125bd67b79f4597972e07d2f703d77e&set=0&refresh=true";
  }
}, []);

  const fetchAISData = async () => {
    return [];
  };

  // Fetch AIS data from MarineTraffic/PoleStar API
  useEffect(() => {
    const fetchAIS = async () => {
      try {
        const aisData = await fetchAISData();
        if (aisData.length > 0) {
          // Merge AIS data with existing vessels - AIS data takes priority
          setVessels(prev => {
            const newState = { ...prev };
            aisData.forEach(v => {
              newState[v.mmsi] = v;
            });
            return newState;
          });
        }
      } catch (error) {
        console.error('Error fetching AIS data:', error);
      }
    };
    fetchAIS();
    // Refresh every 60 seconds
    const interval = setInterval(fetchAIS, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch vessels from Flask API
  useEffect(() => {
    const fetchVessels = async () => {
      try {
        const response = await fetch(`/api/vessels/marquee`);
        const data = await response.json();
        setApiVessels(data);
      } catch (error) {
        console.error("Error fetching vessels from API:", error);
      }
    };

    fetchVessels();
    // Refresh every 30 seconds
    const interval = setInterval(fetchVessels, 30000);
    return () => clearInterval(interval);
  }, []);
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

  const handleVesselSelect = (vessel) => {
    setSelectedVessel(vessel);
  };

  const handleCloseSidebar = () => {
    setSelectedVessel(null);
  };

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
        
        console.log("Weather API Response:", weatherData);
        console.log("Air Quality API Response:", airData);
        
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

  // Fetch shipping news from newsdata.io API
  useEffect(() => {
    const fetchShippingNews = async () => {
      try {
        const response = await fetch(`https://newsdata.io/api/1/latest?apikey=${SHIPPING_NEWS_API_KEY}&q=shipping%20OR%20GAS%20OR%20OIL&language=en`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const news = data.results.slice(0, 10).map((item, index) => ({
            id: index,
            title: item.title || "No title",
            source: item.source_name || "News",
            link: item.link || "",
            image: item.image_url || "",
            time: item.pubDate ? formatTime(item.pubDate) : "Recently"
          }));
          
          setShippingNews(news);
        } else {
          setShippingNews(SAMPLE_SHIPPING_NEWS);
        }
        setNewsLoading(false);
      } catch (error) {
        console.error("Error fetching shipping news, using fallback data:", error);
        setShippingNews(SAMPLE_SHIPPING_NEWS);
        setNewsLoading(false);
      }
    };

    fetchShippingNews();
  }, []);

   // Auto-advance carousel every configurable interval
   useEffect(() => {
     const interval = setInterval(() => {
       setCurrentSlide(prev => (prev === 3 ? 0 : prev + 1));
     }, CONFIG.carouselSlideInterval);
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
    
      // Auto-advance photo carousel every configurable interval for random slideshow feel
      const photoInterval = setInterval(() => {
        setCurrentPhotoSlide(prev => {
          const totalPhotos = shuffled.length;
          // Random jump to create unpredictable feel
          const randomJump = Math.floor(Math.random() * 3) + 1;
          return (prev + randomJump) % totalPhotos;
        });
      }, CONFIG.photoCarouselInterval);
    
    return () => clearInterval(photoInterval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide(prev => (prev === 3 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? 3 : prev - 1));
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
      
      {/* TOP ROW - Marquee Text with API Vessel Data from Flask */}
      

      {/* NEW MARQUEE - Reading from Flask API /api/vessels/marquee */}
      <div style={{
        background:"#1a365d",
        color:"white",
        padding:"10px 0",
        overflow:"hidden",
        whiteSpace:"nowrap"
      }}>
        <div style={{
          display:"inline-block",
          animation:`marquee ${CONFIG.marqueeTopDuration / 1000}s linear infinite`,
          paddingLeft:"100%"
        }}>
        {apiVessels.length > 0 ? (
          apiVessels.map((vessel, index) => (
              <span key={index} style={{marginRight:"50px", fontSize:"16px", fontWeight:"bold"}}>
                🚢 {vessel.vessel} | Position: {vessel.position} | Port: {vessel.port} | ETA: {vessel.eta} | ETB: {vessel.etb} | ETD: {vessel.etd} | NPOC: {vessel.npoc}
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
                ⚓ LOADING VESSEL DATA FROM EXCEL | STAY SAFE AT SEA
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
<div
  style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",

    visibility: currentSlide === 0 ? "visible" : "hidden",

    pointerEvents: currentSlide === 0 ? "auto" : "none",

    zIndex: currentSlide === 0 ? 5 : 1,

    willChange: "transform",
    backfaceVisibility: "hidden",
    transform: "translateZ(0)",

    background: "#0b1220"
  }}
>
  {/* Loading Overlay */}
  {!iframeLoaded && (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#0b1220",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        zIndex: 10
      }}
    >
      <div
        style={{
          width: "60px",
          height: "60px",
          border: "5px solid rgba(255,255,255,0.2)",
          borderTop: "5px solid #38bdf8",
          borderRadius: "50%",
          animation: "spinLoader 1s linear infinite",
          marginBottom: "20px"
        }}
      />

      <div
        style={{
          fontSize: "20px",
          fontWeight: "600",
          letterSpacing: "1px"
        }}
      >
        Loading Vessel Map...
      </div>

      <div
        style={{
          marginTop: "10px",
          opacity: 0.7,
          fontSize: "14px"
        }}
      >
        Initializing AIS layers and vessel markers
      </div>
    </div>
  )}

  {/* Map Iframe */}
  <iframe
    ref={iframeRef}
    onLoad={() => setIframeLoaded(true)}
    src="https://otis.stratumfive.com/viewer/viewer2.aspx?token=6125bd67b79f4597972e07d2f703d77e&set=0&refresh=true"
    style={{
      width: "100%",
      height: "100%",
      border: "none",
      background: "#0b1220"
    }}
    loading="eager"
    allowFullScreen
    title="Vessel Map Viewer"
  />

  {/* Loader Animation */}
  <style>{`
    @keyframes spinLoader {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `}</style>
</div>

          {/* Slide 2: News Section */}
          <div style={{
            width:"100%",
            height:"100%",
            overflow:"auto",
            background:"#f0f4f8",
            padding:"20px",
            position: "absolute", top: 0, left: 0, opacity: currentSlide === 1 ? 1 : 0, transition: "opacity 0.8s ease-in-out", pointerEvents: currentSlide === 1 ? "auto" : "none", zIndex: currentSlide === 1 ? 1 : 0
          }}>
            <h2 style={{color:"#1a365d", marginBottom:"20px", borderBottom:"2px solid #1a365d", paddingBottom:"10px"}}>
              📰 Maritime News
            </h2>
            
            {/* All Cards in Equal Width Responsive Grid - 2 columns: News | Weather */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px", height:"100%", minWidth:0}}>
              
              {/* Column 1 - Scrolling News */}
              <div style={{
                background:"linear-gradient(135deg, #1a365d 0%, #2c5282 100%)",
                borderRadius:"16px",
                boxShadow:"0 10px 25px rgba(0,0,0,0.3)",
                overflow:"hidden",
                display:"flex",
                flexDirection:"column",
                minWidth:0
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
                        {[...shippingNews, ...shippingNews].map((news, index) => (
                          <a 
                            key={`${news.id}-${index}`}
                            href={news.link || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding:"15px 25px",
                              borderBottom:"1px solid rgba(255,255,255,0.1)",
                              display:"flex",
                              alignItems:"center",
                              gap:"15px",
                              transition:"background 0.3s",
                              cursor:"pointer",
                              textDecoration:"none",
                              color:"inherit"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            <img 
                              src={news.image || "https://images.unsplash.com/photo-1583267318076-7c14406f2c9b?w=100&h=60&fit=crop"} 
                              alt="News thumbnail"
                              onError={(e) => {
                                e.target.src = "https://images.unsplash.com/photo-1583267318076-7c14406f2c9b?w=100&h=60&fit=crop";
                              }}
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
                          </a>
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

              {/* Column 2 - Weather */}
              <div style={{
                background:"linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0ea5e9 100%)",
                padding:"20px",
                borderRadius:"16px",
                boxShadow:"0 10px 25px rgba(0,0,0,0.3)",
                color:"white"
              }}>
                <h3 style={{margin:"0 0 15px 0", fontSize:"18px", fontWeight:"600", display:"flex", alignItems:"center", gap:"8px"}}>
                  🌊 Live Weather & Air Quality
                </h3>
                {weatherLoading ? (
                  <p style={{color:"rgba(255,255,255,0.8)", fontSize:"14px"}}>Loading weather data...</p>
                ) : (
                  <div>
                    {/* Weather Emoji and Temperature */}
                    <div style={{display:"flex", alignItems:"center", marginBottom:"20px", background:"rgba(255,255,255,0.2)", borderRadius:"12px", padding:"15px", flexWrap:"wrap", gap:"10px"}}>
                      <div 
                        style={{width:"clamp(50px, 15vw, 80px)", height:"clamp(50px, 15vw, 80px)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"40px", background:"rgba(255,255,255,0.3)", border:"3px solid rgba(255,255,255,0.5)"}}
                      >
                        {getWeatherEmoji(weather?.weather_code)}
                      </div>
                      <div>
                        <div style={{fontSize:"36px", fontWeight:"bold", lineHeight:"1"}}>
                          {weather?.temperature_2m}°C
                        </div>
                        <div style={{fontSize:"12px", opacity: 0.9, marginTop:"5px"}}>📍 Marol, Andheri, Mumbai</div>
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
                       <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", gap:"8px"}}>
                         {/* Mumbai */}
                         <div style={{textAlign:"center"}}>
                           <div style={{width:"36px", height:"36px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.5)", margin:"0 auto 5px", position:"relative", background:"rgba(255,255,255,0.1)"}}>
                             <div style={{position:"absolute", top:"50%", left:"50%", width:"2px", height:"12px", background:"white", transformOrigin:"bottom center", transform:`translate(-50%, -100%) rotate(${((currentTime.getHours() + 5.5) % 24 * 30 + currentTime.getMinutes() * 0.5)}deg)`}}></div>
                             <div style={{position:"absolute", top:"50%", left:"50%", width:"1px", height:"14px", background:"#fbbf24", transformOrigin:"bottom center", transform:`translate(-50%, -100%) rotate(${(currentTime.getMinutes() * 6 + currentTime.getSeconds() * 0.1)}deg)`}}></div>
                           </div>
                           <div style={{fontSize:"10px", opacity: 0.8}}>Mumbai</div>
                           <div style={{fontSize:"11px", fontWeight:"bold"}}>{new Date(currentTime.getTime()).toLocaleTimeString('en-US', {timeZone: 'Asia/Kolkata', hour: '2-digit', minute:'2-digit', hour12: false})}</div>
                         </div>
                         {/* London (UK) */}
                         <div style={{textAlign:"center"}}>
                           <div style={{width:"36px", height:"36px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.5)", margin:"0 auto 5px", position:"relative", background:"rgba(255,255,255,0.1)"}}>
                             <div style={{position:"absolute", top:"50%", left:"50%", width:"2px", height:"12px", background:"white", transformOrigin:"bottom center", transform:`translate(-50%, -100%) rotate(${((currentTime.getUTCHours() + 0) % 24 * 30 + currentTime.getUTCMinutes() * 0.5)}deg)`}}></div>
                             <div style={{position:"absolute", top:"50%", left:"50%", width:"1px", height:"14px", background:"#fbbf24", transformOrigin:"bottom center", transform:`translate(-50%, -100%) rotate(${(currentTime.getUTCMinutes() * 6 + currentTime.getUTCSeconds() * 0.1)}deg)`}}></div>
                           </div>
                           <div style={{fontSize:"10px", opacity: 0.8}}>London</div>
                           <div style={{fontSize:"11px", fontWeight:"bold"}}>{new Date(currentTime.getTime()).toLocaleTimeString('en-US', {timeZone: 'Europe/London', hour: '2-digit', minute:'2-digit', hour12: false})}</div>
                         </div>
                         {/* New York (USA) */}
                         <div style={{textAlign:"center"}}>
                           <div style={{width:"36px", height:"36px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.5)", margin:"0 auto 5px", position:"relative", background:"rgba(255,255,255,0.1)"}}>
                             <div style={{position:"absolute", top:"50%", left:"50%", width:"2px", height:"12px", background:"white", transformOrigin:"bottom center", transform:`translate(-50%, -100%) rotate(${((currentTime.getUTCHours() - 5 + 24) % 24 * 30 + currentTime.getUTCMinutes() * 0.5)}deg)`}}></div>
                             <div style={{position:"absolute", top:"50%", left:"50%", width:"1px", height:"14px", background:"#fbbf24", transformOrigin:"bottom center", transform:`translate(-50%, -100%) rotate(${(currentTime.getUTCMinutes() * 6 + currentTime.getUTCSeconds() * 0.1)}deg)`}}></div>
                           </div>
                           <div style={{fontSize:"10px", opacity: 0.8}}>New York</div>
                           <div style={{fontSize:"11px", fontWeight:"bold"}}>{new Date(currentTime.getTime()).toLocaleTimeString('en-US', {timeZone: 'America/New_York', hour: '2-digit', minute:'2-digit', hour12: false})}</div>
                         </div>
                         {/* Tokyo */}
                         <div style={{textAlign:"center"}}>
                           <div style={{width:"36px", height:"36px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.5)", margin:"0 auto 5px", position:"relative", background:"rgba(255,255,255,0.1)"}}>
                             <div style={{position:"absolute", top:"50%", left:"50%", width:"2px", height:"12px", background:"white", transformOrigin:"bottom center", transform:`translate(-50%, -100%) rotate(${((currentTime.getUTCHours() + 9) % 24 * 30 + currentTime.getUTCMinutes() * 0.5)}deg)`}}></div>
                             <div style={{position:"absolute", top:"50%", left:"50%", width:"1px", height:"14px", background:"#fbbf24", transformOrigin:"bottom center", transform:`translate(-50%, -100%) rotate(${(currentTime.getUTCMinutes() * 6 + currentTime.getUTCSeconds() * 0.1)}deg)`}}></div>
                           </div>
                           <div style={{fontSize:"10px", opacity: 0.8}}>Tokyo</div>
                           <div style={{fontSize:"11px", fontWeight:"bold"}}>{new Date(currentTime.getTime()).toLocaleTimeString('en-US', {timeZone: 'Asia/Tokyo', hour: '2-digit', minute:'2-digit', hour12: false})}</div>
                         </div>
                         {/* Singapore */}
                         <div style={{textAlign:"center"}}>
                           <div style={{width:"36px", height:"36px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.5)", margin:"0 auto 5px", position:"relative", background:"rgba(255,255,255,0.1)"}}>
                             <div style={{position:"absolute", top:"50%", left:"50%", width:"2px", height:"12px", background:"white", transformOrigin:"bottom center", transform:`translate(-50%, -100%) rotate(${((currentTime.getUTCHours() + 8) % 24 * 30 + currentTime.getUTCMinutes() * 0.5)}deg)`}}></div>
                             <div style={{position:"absolute", top:"50%", left:"50%", width:"1px", height:"14px", background:"#fbbf24", transformOrigin:"bottom center", transform:`translate(-50%, -100%) rotate(${(currentTime.getUTCMinutes() * 6 + currentTime.getUTCSeconds() * 0.1)}deg)`}}></div>
                           </div>
                           <div style={{fontSize:"10px", opacity: 0.8}}>Singapore</div>
                           <div style={{fontSize:"11px", fontWeight:"bold"}}>{new Date(currentTime.getTime()).toLocaleTimeString('en-US', {timeZone: 'Asia/Singapore', hour: '2-digit', minute:'2-digit', hour12: false})}</div>
                         </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

{/* Slide 3: Silver Jubilee Countdown */}
            <div style={{
              width:"100%",
              height:"100%",
              overflow:"auto",
              background:"linear-gradient(135deg, #0f172a 0%, #1e1b4b 25%, #312e81 50%, #1e1b4b 75%, #0f172a 100%)",
              padding:"20px",
              position: "absolute", top: 0, left: 0, opacity: currentSlide === 2 ? 1 : 0, transition: "opacity 0.8s ease-in-out", pointerEvents: currentSlide === 2 ? "auto" : "none", zIndex: currentSlide === 2 ? 1 : 0
            }}>
              {/* Confetti Animation Container */}
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                overflow: "hidden",
                zIndex: 1
              }}>
                {[...Array(50)].map((_, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    top: "-10px",
                    left: `${Math.random() * 100}%`,
                    width: "10px",
                    height: "10px",
                    background: ["#fbbf24", "#f97316", "#ef4444", "#22c55e", "#3b82f6", "#8b5cf6"][Math.floor(Math.random() * 6)],
                    borderRadius: Math.random() > 0.5 ? "50%" : "0",
                    animation: `confettiFall ${3 + Math.random() * 4}s linear infinite`,
                    animationDelay: `${Math.random() * 2}s`,
                    opacity: 0.8
                  }} />
                ))}
              </div>

              <style>{`
                @keyframes confettiFall {
                  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                  100% { transform: translateY(100vh) rotate(720deg); opacity: 0.3; }
                }
                @keyframes pulseGlow {
                  0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.3); }
                  50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.8), 0 0 60px rgba(251, 191, 36, 0.5); }
                }
                @keyframes floatUpDown {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-10px); }
                }
              `}</style>

              <h2 style={{
                color: "white",
                marginBottom: "30px",
                borderBottom: "3px solid #fbbf24",
                paddingBottom: "15px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "15px",
                fontSize: "clamp(24px, 4vw, 36px)",
                fontWeight: "bold",
                textShadow: "0 2px 10px rgba(251,191,36,0.5)",
                animation: "floatUpDown 3s ease-in-out infinite"
              }}>
                🎉 Silver Jubilee Countdown 🎊
              </h2>
              
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "calc(100% - 100px)",
                color: "white"
              }}>
                {/* Company Name with Enhanced Styling */}
                <div style={{
                  textAlign: "center",
                  marginBottom: "40px",
                  animation: "floatUpDown 3s ease-in-out infinite",
                  position: "relative"
                }}>
                  {/* Decorative stars */}
                  <div style={{
                    position: "absolute",
                    top: "-20px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: "30px",
                    animation: "pulseGlow 2s ease-in-out infinite"
                  }}>⭐</div>
                  <div style={{
                    position: "absolute",
                    top: "-15px",
                    left: "10%",
                    fontSize: "20px",
                    animation: "floatUpDown 2s ease-in-out infinite"
                  }}>✨</div>
                  <div style={{
                    position: "absolute",
                    top: "-15px",
                    right: "10%",
                    fontSize: "20px",
                    animation: "floatUpDown 2.5s ease-in-out infinite"
                  }}>✨</div>
                  
                  <h1 style={{
                    fontSize: "clamp(28px, 6vw, 56px)",
                    fontWeight: "bold",
                    background: "linear-gradient(45deg, #fbbf24, #f59e0b, #d97706, #fbbf24)",
                    backgroundSize: "200% 200%",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    marginBottom: "15px",
                    animation: "shimmer 3s ease-in-out infinite",
                    textShadow: "0 3px 10px rgba(251,191,36,0.4)"
                  }}>
                    Seven Islands Shipping Limited
                  </h1>
                  <p style={{
                    fontSize: "clamp(18px, 3.5vw, 28px)",
                    color: "rgba(255,255,255,0.9)",
                    margin: 0,
                    fontWeight: "600",
                    letterSpacing: "2px"
                  }}>
                    🏆 Celebrating 25 Years of Maritime Excellence 🏆
                  </p>
                  <p style={{
                    fontSize: "clamp(20px, 4vw, 32px)",
                    color: "#fbbf24",
                    marginTop: "15px",
                    fontWeight: "bold",
                    textShadow: "0 0 20px rgba(251,191,36,0.8)",
                    animation: "pulseGlow 2s ease-in-out infinite"
                  }}>
                    May 2nd, 2027
                  </p>
                </div>
                
                {/* Countdown Timer with Enhanced Visuals */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "25px",
                  width: "100%",
                  maxWidth: "900px",
                  marginBottom: "40px"
                }}>
                  {[
                    { label: "Days", value: jubileeTimeLeft.days, emoji: "📅", color: "#3b82f6" },
                    { label: "Hours", value: jubileeTimeLeft.hours, emoji: "⏰", color: "#8b5cf6" },
                    { label: "Minutes", value: jubileeTimeLeft.minutes, emoji: "⏱️", color: "#f59e0b" },
                    { label: "Seconds", value: jubileeTimeLeft.seconds, emoji: "🔔", color: "#ef4444" }
                  ].map((item, index) => (
                    <div key={index} style={{
                      background: "linear-gradient(145deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
                      borderRadius: "20px",
                      padding: "25px",
                      textAlign: "center",
                      border: `3px solid ${item.color}`,
                      backdropFilter: "blur(10px)",
                      boxShadow: `0 10px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`,
                      transition: "transform 0.3s ease, box-shadow 0.3s ease",
                      position: "relative",
                      overflow: "hidden",
                      animation: "pulseGlow 2s ease-in-out infinite",
                      animationDelay: `${index * 0.2}s`
                    }}>
                      {/* Shine effect */}
                      <div style={{
                        position: "absolute",
                        top: 0,
                        left: "-100%",
                        width: "100%",
                        height: "100%",
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                        animation: "shine 3s infinite"
                      }} />
                      
                      <div style={{
                        fontSize: "clamp(28px, 6vw, 48px)",
                        fontWeight: "bold",
                        color: "#fbbf24",
                        marginBottom: "8px",
                        textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                        fontFamily: "monospace",
                        letterSpacing: "2px"
                      }}>
                        {String(item.value || 0).padStart(2, '0')}
                      </div>
                      <div style={{
                        fontSize: "clamp(10px, 2vw, 16px)",
                        color: "white",
                        textTransform: "uppercase",
                        letterSpacing: "2px",
                        fontWeight: "600"
                      }}>
                        <span style={{marginRight: "5px"}}>{item.emoji}</span>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Celebration Messages with Enhanced Styling */}
                <div style={{
                  display: "flex",
                  gap: "20px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "20px"
                }}>
                  <div style={{
                    background: "linear-gradient(135deg, rgba(251,191,36,0.3) 0%, rgba(245,158,11,0.2) 100%)",
                    borderRadius: "15px",
                    padding: "20px 35px",
                    border: "2px solid #fbbf24",
                    boxShadow: "0 8px 25px rgba(251,191,36,0.4)",
                    animation: "floatUpDown 3s ease-in-out infinite",
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    <span style={{
                      position: "relative",
                      zIndex: 2,
                      fontSize: "clamp(18px, 3vw, 24px)",
                      fontWeight: "bold",
                      color: "#fbbf24",
                      textShadow: "0 2px 5px rgba(0,0,0,0.3)"
                    }}>
                      🚢 25 Years of Maritime Excellence 🚢
                    </span>
                  </div>
                  <div style={{
                    background: "linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(96,165,250,0.2) 100%)",
                    borderRadius: "15px",
                    padding: "20px 35px",
                    border: "2px solid #3b82f6",
                    boxShadow: "0 8px 25px rgba(59,130,246,0.4)",
                    animation: "floatUpDown 3s ease-in-out infinite",
                    animationDelay: "0.5s",
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    <span style={{
                      position: "relative",
                      zIndex: 2,
                      fontSize: "clamp(18px, 3vw, 24px)",
                      fontWeight: "bold",
                      color: "#60a5fa",
                      textShadow: "0 2px 5px rgba(0,0,0,0.3)"
                    }}>
                      ⭐ Silver Jubilee Celebrations ⭐
                    </span>
                  </div>
                </div>

                {/* Additional Celebration Elements */}
                <div style={{
                  marginTop: "30px",
                  display: "flex",
                  gap: "15px",
                  flexWrap: "wrap",
                  justifyContent: "center"
                }}>
                  <span style={{fontSize: "40px", animation: "pulseGlow 1.5s ease-in-out infinite"}}>🎊</span>
                  <span style={{fontSize: "40px", animation: "pulseGlow 1.5s ease-in-out infinite", animationDelay: "0.3s"}}>🎈</span>
                  <span style={{fontSize: "40px", animation: "pulseGlow 1.5s ease-in-out infinite", animationDelay: "0.6s"}}>🎉</span>
                  <span style={{fontSize: "40px", animation: "pulseGlow 1.5s ease-in-out infinite", animationDelay: "0.9s"}}>🌟</span>
                  <span style={{fontSize: "40px", animation: "pulseGlow 1.5s ease-in-out infinite", animationDelay: "1.2s"}}>🏆</span>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 3: Vessel Photos */}
          <div style={{
            width:"100%",
            height:"100%",
            overflow:"auto",
            background:"linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #1a365d 100%)",
            padding:"20px",
            position: "absolute", top: 0, left: 0, opacity: currentSlide === 3 ? 1 : 0, transition: "opacity 0.8s ease-in-out", pointerEvents: currentSlide === 3 ? "auto" : "none", zIndex: currentSlide === 3 ? 1 : 0
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
            aria-label="Show Analytics"
          />
          <button 
            onClick={() => setCurrentSlide(3)}
            style={{
              width:"12px",
              height:"12px",
              borderRadius:"50%",
              border:"none",
              cursor:"pointer",
              background: currentSlide === 3 ? "#1a365d" : "#cbd5e0",
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
          animation:`marquee ${CONFIG.marqueeBottomDuration / 1000}s linear infinite`,
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
  )
}
