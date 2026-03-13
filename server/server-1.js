const WebSocket = require("ws");
const axios = require("axios");

const wss = new WebSocket.Server({ port: 5000 });

console.log("AIS WebSocket server running");

const PODIUM_API_KEY = process.env.PODIUM_API_KEY;

if (!PODIUM_API_KEY) {
  console.warn("WARNING: PODIUM_API_KEY environment variable not set. API calls will fail.");
}

async function fetchVessels() {

  try {

    const response = await axios.get(
      "https://api.podium.example/vessels",
      {
        headers: {
          Authorization: `Bearer ${PODIUM_API_KEY}`
        }
      }
    );

    const vessels = response.data;

    vessels.forEach(vessel => {

      const message = JSON.stringify({
        mmsi: vessel.mmsi,
        vesselName: vessel.name,
        lat: vessel.latitude,
        lon: vessel.longitude,
        speed: vessel.speed,
        heading: vessel.heading,
        destination: vessel.destination
      });

      broadcast(message);

    });

  } catch (err) {
    console.error(err.message);
  }

}

function broadcast(message) {

  wss.clients.forEach(client => {

    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }

  });

}

setInterval(fetchVessels, 5000);