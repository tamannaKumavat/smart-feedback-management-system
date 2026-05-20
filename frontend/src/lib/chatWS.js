import { showError } from "./toast";

let socket = null;
let retryCount = 0;
const maxRetries = 5;
const retryDelay = 2000; // 2 seconds
let listeners = []; // Array of { onMessage, onError, onClose } callbacks

// --- WebSocket URL (adjust for production) ---
const getWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/chat`;
};

// --- Initialize WebSocket ---
export const initWebSocket = (onMessage, onError, onClose) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    // Already connected, just add listener
    listeners.push({ onMessage, onError, onClose });
    return;
  }

  // Add listener
  listeners.push({ onMessage, onError, onClose });

  const connect = () => {
    socket = new WebSocket(getWsUrl());

    socket.onopen = () => {
      console.log("WebSocket connected");
      retryCount = 0; // Reset retry count on success
      // Notify all listeners of connection
      listeners.forEach((listener) => {
        if (listener.onOpen) listener.onOpen();
      });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        listeners.forEach((listener) => {
          if (listener.onMessage) listener.onMessage(data);
        });
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
      listeners.forEach((listener) => {
        if (listener.onClose) listener.onClose();
      });
      // Retry connection
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(connect, retryDelay);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      listeners.forEach((listener) => {
        if (listener.onError) listener.onError(error);
      });
    };
  };

  connect();
};

// --- Send Message ---
export const sendWebSocketMessage = (message) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    showError("WebSocket is not connected. Please wait and try again.", "Connection error");
    return false;
  }
  try {
    socket.send(JSON.stringify(message));
    return true;
  } catch (err) {
    showError(`Failed to send message: ${err.message}`, "WebSocket error");
    return false;
  }
};

// --- Close WebSocket ---
export const closeWebSocket = () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
    socket = null;
  }
  listeners = []; // Clear listeners
};

// --- Check WebSocket Status ---
export const isWebSocketReady = () => {
  return socket && socket.readyState === WebSocket.OPEN;
};