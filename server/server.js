
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 5000 });

console.log("AIS WebSocket Server running on port 5000");

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

wss.on("connection", ws => {
  console.log("Client connected");
});

setInterval(() => {

  vessels.forEach(v => {

    v.lat += (Math.random() - 0.5) * 0.02;
    v.lon += (Math.random() - 0.5) * 0.02;

    v.history.push([v.lat, v.lon]);
    if (v.history.length > 25) v.history.shift();

    const message = JSON.stringify(v);

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

  });

}, 2000);
