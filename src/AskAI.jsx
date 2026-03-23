import React, { useState } from "react";

const AskAI = ({ onApplyAiResult, contextData }) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Ask about plots, project details, map filters, coordinates, or company details.",
    },
  ]);

  const handleSend = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || loading) return;

    const userMessage = { role: "user", content: trimmedPrompt };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setLoading(true);

    try {
      const res = await fetch("/.netlify/functions/ask-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          context: contextData,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (parseError) {
        throw new Error("Invalid response from AI function.");
      }

      if (!res.ok) {
        throw new Error(data.message || "Failed to connect to AI.");
      }

      const assistantMessage = {
        role: "assistant",
        content: data.message || "No response received.",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.allowed && typeof onApplyAiResult === "function") {
        onApplyAiResult(data);
      }
    } catch (error) {
      console.error("AskAI error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error.message ||
            "Unable to connect to AI. Please check the Netlify function.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Ask about plots, project details, map filters, coordinates, or company details.",
      },
    ]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      data-ui="true"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        right: "20px",
        bottom: "135px",
        zIndex: 2000,
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {open ? (
        <div
          style={{
            width: "340px",
            height: "460px",
            background: "#fff",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid #e5e5e5",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: 600,
              background: "#ffffff",
            }}
          >
            <span>Ask AI</span>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={handleClearChat}
                type="button"
                style={{
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Clear
              </button>

              <button
                onClick={() => setOpen(false)}
                type="button"
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "20px",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              overflowY: "auto",
              background: "#fafafa",
            }}
          >
            {messages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}`}
                style={{
                  maxWidth: "85%",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  lineHeight: 1.45,
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  background: msg.role === "user" ? "#111827" : "#f1f5f9",
                  color: msg.role === "user" ? "#fff" : "#111827",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  maxWidth: "85%",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  lineHeight: 1.45,
                  alignSelf: "flex-start",
                  background: "#f1f5f9",
                  color: "#111827",
                }}
              >
                Thinking...
              </div>
            )}
          </div>

          <div
            style={{
              borderTop: "1px solid #eee",
              background: "#fff",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#6b7280",
                lineHeight: 1.4,
              }}
            >
              Try: Show available east facing plots, Tell me about Plot 291,
              Show coordinates for a plot, What services does Luminexa provide?
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "flex-end",
              }}
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about plots, project, map..."
                rows={2}
                style={{
                  flex: 1,
                  resize: "none",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  outline: "none",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  lineHeight: 1.4,
                }}
              />

              <button
                onClick={handleSend}
                disabled={loading || !prompt.trim()}
                type="button"
                style={{
                  padding: "10px 14px",
                  border: "none",
                  borderRadius: "10px",
                  background: loading || !prompt.trim() ? "#9ca3af" : "#111827",
                  color: "#fff",
                  cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
                  minWidth: "64px",
                  height: "42px",
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            background: "#111827",
            color: "#fff",
            border: "none",
            borderRadius: "999px",
            padding: "12px 18px",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            fontWeight: 600,
          }}
        >
          Ask AI
        </button>
      )}
    </div>
  );
};

export default AskAI;