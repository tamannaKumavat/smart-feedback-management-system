import { useEffect, useRef, useState } from "react";
import { FiSend } from "react-icons/fi";
import PortalLayout from "../../layouts/PortalLayout.jsx";

export default function ClientCreateTicketWS() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [disabled, setDisabled] = useState(true);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const scrollRef = useRef(null);

  // Connect to WebSocket ONCE on mount
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/chat");

    ws.onopen = () => {
      setConnected(true);
      setDisabled(false);
      addMessage("System", "Connected to server. Waiting for workflow to start...");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "token") {
        // Add streamed token to messages
        addMessage("Server", data.token, true);
      } else if (data.type === "interrupt") {
        // Enable input for user response
        // addMessage("Server", data.message);
        setDisabled(false);
      } else if (data.type === "message") {
        // Add final message
        addMessage("Server", data.message.content);
        setDisabled(false);
      }
    };

    ws.onerror = (error) => {
      addMessage("Error", `WebSocket error: ${error}`);
      setConnected(false);
      setDisabled(true);
    };

    ws.onclose = () => {
      setConnected(false);
      setDisabled(true);
      addMessage("System", "Disconnected from server.");
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []); // Only once on mount

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (sender, text, isStreaming = false) => {
    setMessages((prev) => {
      // If streaming, append to the last message
      if (isStreaming && prev.length > 0 && prev[prev.length - 1].sender === sender) {
        return [
          ...prev.slice(0, -1),
          {
            ...prev[prev.length - 1],
            content: prev[prev.length - 1].content + text,
          },
        ];
      }
      // Otherwise, create a new message
      return [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          sender,
          content: text,
        },
      ];
    });
  };

  const sendMessage = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !input.trim()) {
      return;
    }

    addMessage("You", input);
    wsRef.current.send(JSON.stringify({ content: input }));
    setInput("");
    setDisabled(true);
  };

  return (
    <PortalLayout mode="client">
      <div className="mx-auto flex h-[calc(100dvh-6rem)] max-h-[calc(100dvh-6rem)] min-h-0 w-full max-w-[600px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <h1 className="text-[18px] font-semibold text-[#0f172a]">Chat</h1>
          <div className={`ml-auto text-[12px] px-3 py-1 rounded-full ${connected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {connected ? "✓ Connected" : "✗ Disconnected"}
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4 space-y-3"
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "You" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs px-4 py-2.5 rounded-lg text-[13px] break-words ${
                  msg.sender === "You"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              disabled={disabled}
              className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={sendMessage}
              disabled={disabled || !input.trim()}
              className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <FiSend className="text-[16px]" />
            </button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
