
// WebSocket URL - can be overridden via environment variable
const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:5001";

// Lazy-initialized socket
let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

// Create and configure the WebSocket connection
function createSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return socket;
  }

  socket = new WebSocket(WS_URL);

  socket.onerror = (error) => {
    console.error("WebSocket connection error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket disconnected");
    socket = null;
    
    // Attempt reconnection with exponential backoff
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1);
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      setTimeout(() => createSocket(), delay);
    } else {
      console.error("Max reconnection attempts reached. Please refresh the page or check the server.");
    }
  };

  socket.onopen = () => {
    console.log("WebSocket connected to", WS_URL);
    reconnectAttempts = 0; // Reset on successful connection
  };

  return socket;
}

// Export function to listen for AIS messages
// Uses lazy initialization - socket is created when first called
// Handles both individual vessel updates and batch updates
export const listenAIS = (callback) => {
  const ws = createSocket();
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Handle batch update (array of vessels) - pass entire array to callback
      // Handle individual vessel update (legacy format) - pass single vessel
      callback(data);
    } catch (err) {
      console.error("Failed to parse vessel data:", err);
    }
  };
};

// Export function to check connection status
export const isConnected = () => {
  return socket && socket.readyState === WebSocket.OPEN;
};

// Export function to manually reconnect
export const reconnect = () => {
  if (socket) {
    socket.close();
  }
  reconnectAttempts = 0;
  createSocket();
};
