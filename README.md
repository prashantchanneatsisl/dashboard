
# Maritime AIS Dashboard (React + Node.js)

Real-time vessel tracking dashboard similar to maritime monitoring platforms.

Features
- Real-time AIS streaming via WebSocket
- Ship icons on map
- Vessel card panel
- Vessel route history (tracks)
- Marker clustering for large fleets

## Requirements
Node.js 18+

## Run Node.js WebSocket Server

cd server
npm install
node server.js

Server runs at:
ws://localhost:5000

## Run Python Flask Server (for vessel data and news feeds)

cd pyserver
pip install -r requirements.txt
python app.py

Server runs at:
http://localhost:5000

## Run React Client

cd client
npm install
npm start

Open:
http://localhost:3000

The server simulates AIS vessel movement every 2 seconds.
Replace the simulator with a real AIS provider (Podium, Spire, etc).
