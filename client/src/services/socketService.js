
const socket = new WebSocket("ws://localhost:5000");

export const listenAIS = (callback)=>{
  socket.onmessage = (event)=>{
    const vessel = JSON.parse(event.data);
    callback(vessel);
  };
};
