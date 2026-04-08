
// WebSocket URL - dynamically determined based on current page location
// Falls back to localhost:5001 for local development
function getWebSocketURL() {
  const wsPort = process.env.REACT_APP_WS_PORT || "5001";
  
  // Check if explicit WS_URL is set
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }
  
  // Use current page's hostname and determine WebSocket port
  const hostname = window.location.hostname;
  const isHTTPS = window.location.protocol === 'https:';
  const protocol = isHTTPS ? 'wss://' : 'ws://';
  
  // Try to use same port for WebSocket (common in dev), otherwise use default
  const currentPort = window.location.port;
  const wsPortFinal = currentPort ? currentPort : wsPort;
  
  return `${protocol}${hostname}:${wsPortFinal}`;
}

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

  const WS_URL = getWebSocketURL();
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
    console.log("WebSocket connected to", getWebSocketURL());
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
