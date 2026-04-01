require('dotenv').config();
const WebSocket = require("ws");
const axios = require("axios");
const { exec } = require("child_process");
const net = require("net");
const { VesselSourceModel } = require('./models');

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'production';

// JWT Token caching
let cachedToken = null;
let tokenExpiry = null;

// Function to get JWT token using OAuth2 client_credentials grant
async function getAuthToken() {
  // Check if cached token is still valid (with 5 minute buffer)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 5 * 60 * 1000) {
    console.log('>>> Using cached JWT token');
    return cachedToken;
  }

  try {
    console.log('>>> Requesting new JWT token from Aviso API...');
    console.log(`>>> Auth URL: ${PODIUM_API_URL}/api/identity/connect/token`);
    console.log(`>>> Client ID: ${PODIUM_CLIENT_ID}`);
    console.log(`>>> Scope: ${PODIUM_SCOPE}`);

    // Create form data for multipart/form-data request
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('client_id', PODIUM_CLIENT_ID);
    formData.append('client_secret', PODIUM_CLIENT_SECRET);
    formData.append('grant_type', 'client_credentials');
    formData.append('scope', PODIUM_SCOPE);

    const response = await authApiClient.post('/api/identity/connect/token', formData, {
      headers: {
        'Accept': 'application/json',
        ...formData.getHeaders()
      }
    });

    console.log('>>> JWT token obtained successfully');
    console.log(`>>> Token type: ${response.data.token_type}`);
    console.log(`>>> Expires in: ${response.data.expires_in} seconds`);
    console.log(`>>> Bearer Token: ${response.data.access_token}`);

    // Cache the token
    cachedToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000);

    return cachedToken;
  } catch (err) {
    console.error('>>> Error obtaining JWT token:');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error(`Status Text: ${err.response.statusText}`);
      console.error(`Response Data:`, err.response.data);
    } else {
      console.error(`Error: ${err.message}`);
    }
    throw err;
  }
}

// WebSocket server configuration
let wss;
const WS_PORT = process.env.WS_PORT || 5001;

// Helper function to check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

// Helper function to kill process on a specific port
function killProcessOnPort(port) {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}` 
      : `lsof -ti:${port}`;
    
    exec(command, (error, stdout) => {
      if (error || !stdout) {
        console.log(`No process found on port ${port}`);
        resolve(false);
        return;
      }

      // Extract PID based on platform
      let pid;
      if (process.platform === 'win32') {
        const lines = stdout.trim().split('\n');
        if (lines.length > 0) {
          const parts = lines[0].trim().split(/\s+/);
          pid = parts[parts.length - 1];
        }
      } else {
        pid = stdout.trim();
      }

      if (pid) {
        console.log(`Killing existing process on port ${port} (PID: ${pid})`);
        exec(process.platform === 'win32' ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`, (killErr) => {
          if (killErr) {
            console.error(`Failed to kill process: ${killErr.message}`);
            resolve(false);
          } else {
            // Wait a bit for the port to be released
            setTimeout(() => resolve(true), 1000);
          }
        });
      } else {
        resolve(false);
      }
    });
  });
}

// Initialize WebSocket server with port conflict handling
async function initializeServer() {
  const portInUse = await isPortInUse(WS_PORT);
  
  if (portInUse) {
    console.log(`Port ${WS_PORT} is already in use. Attempting to free it...`);
    const freed = await killProcessOnPort(WS_PORT);
    
    if (!freed) {
      console.error(`Could not free port ${WS_PORT}. Please stop the existing server manually.`);
      console.error(`You can find the process using: ${process.platform === 'win32' ? 'netstat -ano | findstr :' + WS_PORT : 'lsof -i:' + WS_PORT}`);
      process.exit(1);
    }
    console.log(`Port ${WS_PORT} is now free. Starting server...`);
  }

  try {
    wss = new WebSocket.Server({ port: WS_PORT });
    console.log(`AIS WebSocket server running on port ${WS_PORT}`);
    console.log(`Running in ${NODE_ENV} mode`);
    
    // Track connected clients
    let clientCount = 0;
    
    // Handle client connections
    wss.on('connection', (ws) => {
      clientCount++;
      console.log(`Client connected. Total clients: ${clientCount}`);
      
      // Send current vessels to new client immediately
      fetchVessels().then(vessels => {
        const vesselArray = Array.isArray(vessels) ? vessels : [];
        if (vesselArray.length > 0) {
          const vesselsToBroadcast = vesselArray.map(v => ({
            mmsi: v.mmsi,
            vesselName: v.vesselName || `Vessel ${v.mmsi}`,
            lat: v.lat,
            lon: v.lon,
            speed: v.speed,
            heading: v.heading,
            destination: v.destination,
            imo: v.imo,
            accountId: v.accountId,
            entityId: v.entityId,
            dataSource: v.dataSource,
            tmlnSeriesType: v.tmlnSeriesType,
            totalTimestamps: v.totalTimestamps,
            minTimestamp: v.minTimestamp,
            maxTimestamp: v.maxTimestamp
          }));
          ws.send(JSON.stringify(vesselsToBroadcast));
        }
      });
      
      ws.on('close', () => {
        clientCount--;
        console.log(`Client disconnected. Total clients: ${clientCount}`);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
      });
    });
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`Error: Port ${WS_PORT} is still in use after attempt to free it.`);
      console.error(`Please stop the existing server manually and try again.`);
      process.exit(1);
    } else {
      throw err;
    }
  }
}

// Run the server initialization
initializeServer().then(() => {
  // Start fetching vessels after server is initialized
  fetchVessels();
  setInterval(fetchVessels, 30000);
});

// API Configuration based on environment
let PODIUM_API_URL, PODIUM_AUTH_API_URL, PODIUM_CLIENT_ID, PODIUM_CLIENT_SECRET, PODIUM_SCOPE;
let PODIUM_USERNAME, PODIUM_PASSWORD;
let PODIUM_FETCH_ALL_VESSELS_API_URL;

// Production environment configuration
PODIUM_API_URL = process.env.PODIUM_API_URL;
PODIUM_AUTH_API_URL = process.env.PODIUM_AUTH_API_URL || "https://aviso-api.stratumfive.com/api/identity/connect/token";
PODIUM_FETCH_ALL_VESSELS_API_URL = process.env.PODIUM_FETCH_ALL_VESSELS_API_URL || "https://aviso-api.stratumfive.com/api/tmln/v2/cf/timeline/info";
PODIUM_CLIENT_ID = process.env.PODIUM_CLIENT_ID;
PODIUM_CLIENT_SECRET = process.env.PODIUM_CLIENT_SECRET;
PODIUM_SCOPE = process.env.PODIUM_SCOPE || "extract-by-imo:metrics";
PODIUM_USERNAME = process.env.PODIUM_USERNAME;
PODIUM_PASSWORD = process.env.PODIUM_PASSWORD;
console.log(`Production API URL: ${PODIUM_API_URL}`);
console.log(`Auth API URL: ${PODIUM_AUTH_API_URL}`);
console.log(`Fetch All Vessels API URL: ${PODIUM_FETCH_ALL_VESSELS_API_URL}`);
console.log(`Podium Username: ${PODIUM_USERNAME}`);

if (!PODIUM_CLIENT_ID || !PODIUM_CLIENT_SECRET) {
  console.warn("WARNING: PODIUM_CLIENT_ID or PODIUM_CLIENT_SECRET environment variables not set. API calls will fail.");
}

if (!PODIUM_AUTH_API_URL) {
  console.warn("WARNING: PODIUM_AUTH_API_URL environment variable not set. Using default.");
}

// Create axios instance with appropriate auth based on environment
let apiClient;

// Production environment uses JWT Bearer token from OAuth2 client_credentials
console.log('>>> Using JWT Bearer Token for Production environment');

// Create axios instance - Authorization header will be set dynamically
apiClient = axios.create({
  baseURL: PODIUM_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Create separate API client for authentication (no auth header needed)
const authApiClient = axios.create({
  baseURL: PODIUM_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to inject JWT token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAuthToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    } catch (err) {
      return Promise.reject(err);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Example MMSI list - in production, this could be configured or fetched from a source
const MMSI_LIST = [
  538009876,  // MSC ALICE
  219876543,  // MAERSK RIO
  371256789,  // Example vessel
  477995678,  // Example vessel
  636092092   // Example vessel
];





// Fetch all vessels from PODIUM_FETCH_ALL_VESSELS_API_URL using GET with Bearer token
async function fetchAllVesselsFromPodium() {
  try {
    console.log(`\n--- [PODIUM FETCH ALL] API Request ---`);
    console.log(`URL: ${PODIUM_API_URL}/api/tmln/v2/cf/timeline/info`);
    console.log(`Method: GET`);
    console.log(`Auth: Bearer Token`);

    // Get the JWT token
    const token = await getAuthToken();

    // Make GET request with Bearer token using apiClient
    const response = await apiClient.get('/api/tmln/v2/cf/timeline/info', {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`--- [PODIUM FETCH ALL] API Response ---`);
    console.log(`Status: ${response.status}`);

    // Parse response using VesselSource model
    const vesselSources = VesselSourceModel.parseResponse(response.data);
    console.log(`>>> Parsed ${vesselSources.length} vessel sources from API response`);

    // Get unique vessels (deduplicated by IMO)
    const uniqueVessels = VesselSourceModel.getUniqueVessels(vesselSources);
    console.log(`>>> Found ${uniqueVessels.length} unique vessels`);

    // Fetch position data for each vessel using timeline extract endpoint
    const vesselsWithPositions = await Promise.all(
      uniqueVessels.map(async (vessel) => {
        try {
          // Calculate date range (last 24 hours)
          const to = new Date();
          const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
          const minTimestamp = from.toISOString();
          const maxTimestamp = to.toISOString();

          // Fetch position data using timeline extract endpoint
          // Reference: curl --request POST --url https://aviso-api.stratumfive.com/api/tmln/v2/cf/timeline/extract
          const positionResponse = await apiClient.post('/api/tmln/v2/cf/timeline/extract', {
            query: {
              accountId: vessel.accountId,
              entityId: vessel.entityId,
              includeDebugInfo: true,
              limit: 1,
              minTimestamp: minTimestamp,
              maxTimestamp: maxTimestamp,
              tmlnDatasource: vessel.tmlnDatasource,
              tmlnSeriesType: vessel.tmlnSeriesType
            }
          });

          // Log positionResponse for debugging
          console.log(`\n--- [TIMELINE EXTRACT] Vessel: ${vessel.vesselName} (IMO: ${vessel.vesselIMO}) ---`);
          console.log(`Status: ${positionResponse.status}`);
          console.log(`Request Query:`, JSON.stringify({
            accountId: vessel.accountId,
            entityId: vessel.entityId,
            includeDebugInfo: true,
            limit: 1,
            minTimestamp: minTimestamp,
            maxTimestamp: maxTimestamp,
            tmlnDatasource: vessel.tmlnDatasource,
            tmlnSeriesType: vessel.tmlnSeriesType
          }, null, 2));
          console.log(`Response Data:`, JSON.stringify(positionResponse.data, null, 2));

          // Process position data from response
          // Note: Response format may vary based on API version - adjust parsing logic as needed
          let lat = null;
          let lon = null;
          let speed = 0;
          let heading = 0;
          let destination = '';
          let accountId = vessel.accountId;
          let entityId = vessel.entityId;
          let tmlnDatasource = vessel.tmlnDatasource;
          let tmlnSeriesType = vessel.tmlnSeriesType;

          if (positionResponse.data && positionResponse.data.series && Array.isArray(positionResponse.data.series)) {
            // Get the most recent position from series array
            const latestPosition = positionResponse.data.series[positionResponse.data.series.length - 1];
            if (latestPosition) {
              lat = latestPosition.lat;
              lon = latestPosition.lon;
              
              // Extract speed, course, heading, and destination from columns array
              if (latestPosition.columns && Array.isArray(latestPosition.columns)) {
                latestPosition.columns.forEach(col => {
                  if (col.name === 'sensor.sog') {
                    speed = parseFloat(col.value) || 0;
                  } else if (col.name === 'sensor.course') {
                    heading = parseFloat(col.value) || 0;
                  } else if (col.name === 'sensor.heading') {
                    heading = parseFloat(col.value) || heading;
                  } else if (col.name === 'static.destination') {
                    destination = col.value || '';
                  }
                });
              }
            }
          }

          // Log position data for every unique vessel
          console.log(`\n--- [POSITION DATA] Vessel: ${vessel.vesselName} (IMO: ${vessel.vesselIMO}) ---`);
          console.log(`Latitude: ${lat}`);
          console.log(`Longitude: ${lon}`);
          console.log(`Speed: ${speed} knots`);
          console.log(`Heading: ${heading}°`);
          console.log(`Destination: ${destination}`);
          console.log(`Account ID: ${accountId}`);
          console.log(`Entity ID: ${entityId}`);
          console.log(`Data Source: ${tmlnDatasource}`);
          console.log(`Series Type: ${tmlnSeriesType}`);

          return {
            mmsi: vessel.vesselIMO, // Use IMO as identifier
            vesselName: vessel.vesselName,
            lat: lat,
            lon: lon,
            speed: speed,
            heading: heading,
            destination: destination,
            imo: vessel.vesselIMO,
            accountId: accountId,
            entityId: entityId,
            dataSource: tmlnDatasource,
            tmlnSeriesType: tmlnSeriesType,
            totalTimestamps: vessel.tmlnStats.totalTimestamps,
            minTimestamp: vessel.tmlnStats.minTimestamp,
            maxTimestamp: vessel.tmlnStats.maxTimestamp
          };
        } catch (err) {
          console.error(`Error fetching position for vessel ${vessel.vesselName}:`, err.message);
          // Return vessel without position data
          return {
            mmsi: vessel.vesselIMO,
            vesselName: vessel.vesselName,
            lat: null,
            lon: null,
            speed: 0,
            heading: 0,
            destination: '',
            imo: vessel.vesselIMO,
            accountId: vessel.accountId,
            entityId: vessel.entityId,
            dataSource: vessel.tmlnDatasource,
            tmlnSeriesType: vessel.tmlnSeriesType,
            totalTimestamps: vessel.tmlnStats.totalTimestamps,
            minTimestamp: vessel.tmlnStats.minTimestamp,
            maxTimestamp: vessel.tmlnStats.maxTimestamp
          };
        }
      })
    );

    // Filter out vessels without position data
    const vessels = vesselsWithPositions.filter(v => v.lat !== null && v.lon !== null);
    console.log(`>>> Returning ${vessels.length} vessels with position data from Podium API`);
    return vessels;

  } catch (err) {
    console.error(`\n--- [PODIUM FETCH ALL] API Error ---`);
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error(`Status Text: ${err.response.statusText}`);
      console.error(`Response Data:`, err.response.data);
    } else if (err.request) {
      console.error(`No response received - Request:`, err.request);
    } else {
      console.error(`Error:`, err.message);
    }
    return [];
  }
}

// Helper function to process vessel data
function processVesselData(vesselsMap, item) {
  if (!vesselsMap.has(item.mmsi)) {
    vesselsMap.set(item.mmsi, {
      mmsi: item.mmsi,
      vesselName: '',
      lat: null,
      lon: null,
      speed: 0,
      heading: 0,
      destination: ''
    });
  }
  
  const vessel = vesselsMap.get(item.mmsi);
  
  // Check if it's a dynamic message (has lat, lon, sogKts, cog, heading)
  if (item.lat !== undefined && item.lon !== undefined) {
    vessel.lat = item.lat;
    vessel.lon = item.lon;
    vessel.speed = item.sogKts || 0;
    vessel.heading = item.heading || 0;
  }
  
  // Check if it's a static message (has name, destination)
  if (item.name) {
    vessel.vesselName = item.name;
  }
  if (item.destination) {
    vessel.destination = item.destination;
  }
}

// Helper function to log errors
function logError(err, mmsi, fromStr, toStr) {
  const url = mmsi ? `/ais/positions/${mmsi}/${fromStr}/${toStr}` : '/';
  console.log(`URL: ${PODIUM_API_URL}${url}`);
  if (err.response) {
    console.log(`Status: ${err.response.status}`);
    console.log(`Status Text: ${err.response.statusText}`);
    console.log(`Response Headers:`, err.response.headers);
    console.log(`Response Data:`, err.response.data);
  } else if (err.request) {
    console.log(`No response received - Request:`, err.request);
  } else {
    console.log(`Error:`, err.message);
  }
}

// Helper function to get API URL for logging
function getApiUrl() {
  return PODIUM_API_URL;
}

// Main fetch function that delegates to appropriate implementation
async function fetchVessels() {
  let vessels = [];
  
  // Use the new fetchAllVesselsFromPodium function for production
  vessels = await fetchAllVesselsFromPodium();

  // Ensure vessels is always an array
  if (!Array.isArray(vessels)) {
    vessels = [];
  }

  // Broadcast all vessels as a single array message
  if (vessels.length > 0) {
    const vesselsToBroadcast = vessels.map(v => ({
      mmsi: v.mmsi,
      vesselName: v.vesselName || `Vessel ${v.mmsi}`,
      lat: v.lat,
      lon: v.lon,
      speed: v.speed,
      heading: v.heading,
      destination: v.destination,
      imo: v.imo,
      accountId: v.accountId,
      entityId: v.entityId,
      dataSource: v.dataSource,
      tmlnSeriesType: v.tmlnSeriesType,
      totalTimestamps: v.totalTimestamps,
      minTimestamp: v.minTimestamp,
      maxTimestamp: v.maxTimestamp
    }));
    
    const message = JSON.stringify(vesselsToBroadcast);
    broadcast(message);
    console.log(`>>> Broadcasting ${vessels.length} vessels`);
  }
  
  return vessels;
}

function broadcast(message) {
  if (!wss) {
    console.log('WebSocket server not ready yet, skipping broadcast');
    return;
  }
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

