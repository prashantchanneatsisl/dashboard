
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 5000 });

console.log("AIS WebSocket Server running on port 5000");

// Configuration
const UPDATE_INTERVAL_MS = 2000;
const MAX_HISTORY_LENGTH = 25;

// Initialize vessels with unique IDs for React keys
let vessels = [
  {
    mmsi: "538009876",
    vesselName: "MSC ALICE",
    lat: 19.1,
    lon: 72.8,
    speed: 14,
    heading: 90,
    destination: "Singapore",
    history: []
  },
  {
    mmsi: "219876543",
    vesselName: "MAERSK RIO",
    lat: 18.9,
    lon: 72.9,
    speed: 10,
    heading: 120,
    destination: "Dubai",
    history: []
  }
];

// Track connected clients for logging
let clientCount = 0;

wss.on("connection", ws => {
  clientCount++;
  console.log(`Client connected. Total clients: ${clientCount}`);
  
  // Send initial state immediately on connection
  const initialMessage = JSON.stringify(vessels);
  ws.send(initialMessage);
  
  ws.on("close", () => {
    clientCount--;
    console.log(`Client disconnected. Total clients: ${clientCount}`);
  });
  
  ws.on("error", (error) => {
    console.error("WebSocket error:", error.message);
  });
});

// Update vessel positions and broadcast batch
function updateAndBroadcast() {
  // Skip if no clients connected
  if (clientCount === 0) {
    return;
  }
  
  // Update all vessel positions
  vessels.forEach(v => {
    v.lat += (Math.random() - 0.5) * 0.02;
    v.lon += (Math.random() - 0.5) * 0.02;
    
    // Add to history
    v.history.push([v.lat, v.lon]);
    if (v.history.length > MAX_HISTORY_LENGTH) {
      v.history.shift();
    }
  });
  
  // Send batch update to all connected clients
  const message = JSON.stringify(vessels);
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Start the broadcast interval
setInterval(updateAndBroadcast, UPDATE_INTERVAL_MS);

console.log(`Broadcasting vessel positions every ${UPDATE_INTERVAL_MS}ms`);
