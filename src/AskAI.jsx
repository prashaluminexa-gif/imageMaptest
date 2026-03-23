import React, { useState, useRef, useEffect } from "react";

const AskAI = ({ onApplyAiResult, contextData }) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const messagesRef = useRef(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  const stopEvent = (e) => {
    e.stopPropagation();
  };

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
    setMessages([]);
    setPrompt("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const LeafIcon = ({ size = 12 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 21c10-1 14-9 14-16-7 0-15 4-16 14" />
      <path d="M5 21c3-6 8-10 14-14" />
    </svg>
  );

  const UserIcon = ({ size = 10 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );

  const SendIcon = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.4 20.4 21 12 3.4 3.6l.1 6.5 11.5 1.9L3.5 14z" />
    </svg>
  );

  return (
    <>
      <style>{`
        .askai-scroll::-webkit-scrollbar {
          width: 5px;
        }

        .askai-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .askai-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.18);
          border-radius: 999px;
        }

        .askai-dots {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .askai-dots span {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: #111111;
          display: inline-block;
          animation: askaiBounce 1.2s infinite ease-in-out;
        }

        .askai-dots span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .askai-dots span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes askaiBounce {
          0%, 80%, 100% {
            transform: scale(0.7);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      <div
        data-ui="true"
        onMouseDown={stopEvent}
        onMouseMove={stopEvent}
        onMouseUp={stopEvent}
        onTouchStart={stopEvent}
        onClick={stopEvent}
        style={{
          position: "fixed",
          right: "10px",
          bottom: "10px",
          zIndex: 2000,
          fontFamily: "'Montserrat', sans-serif",
          touchAction: "auto",
        }}
      >
        {open ? (
          <div
            onMouseDown={stopEvent}
            style={{
              width: "255px",
              height: "345px",
              background: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid #e5e5e5",
            }}
          >
            <div
              style={{
                padding: "9px 10px",
                borderBottom: "1px solid #efefef",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#111111",
                color: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <LeafIcon size={12} />
                </div>
                <span>Ask AI</span>
              </div>

              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <button
                  onClick={handleClearChat}
                  type="button"
                  style={{
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "transparent",
                    color: "#ffffff",
                    padding: "4px 7px",
                    borderRadius: "7px",
                    cursor: "pointer",
                    fontSize: "10px",
                    lineHeight: 1,
                  }}
                >
                  Clear
                </button>

                <button
                  onClick={() => setOpen(false)}
                  type="button"
                  style={{
                    width: "22px",
                    height: "22px",
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "transparent",
                    color: "#ffffff",
                    borderRadius: "7px",
                    fontSize: "14px",
                    cursor: "pointer",
                    lineHeight: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div
              ref={messagesRef}
              className="askai-scroll"
              onMouseDown={stopEvent}
              style={{
                flex: 1,
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                overflowY: "auto",
                overflowX: "hidden",
                background: "#ffffff",
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
                touchAction: "pan-y",
                position: "relative",
              }}
            >
              {messages.length === 0 && !loading && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    pointerEvents: "none",
                    opacity: 0.75,
                    width: "80%",
                  }}
                >
                  <div
                    style={{
                      fontSize: "20px",
                      color: "#111111",
                      marginBottom: "6px",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <LeafIcon size={20} />
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#111111",
                      marginBottom: "4px",
                    }}
                  >
                    Ask anything
                  </div>

                  <div
                    style={{
                      fontSize: "10px",
                      color: "#8a8a8a",
                      lineHeight: 1.45,
                    }}
                  >
                    Try: Available plots, facing filter,
                    <br />
                    plot details, coordinates
                  </div>
                </div>
              )}

              {messages.map((msg, index) => {
                const isUser = msg.role === "user";

                return (
                  <div
                    key={`${msg.role}-${index}`}
                    style={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: isUser ? "row-reverse" : "row",
                        alignItems: "flex-end",
                        gap: "5px",
                        maxWidth: "92%",
                      }}
                    >
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "999px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          background: isUser ? "#111111" : "#ffffff",
                          color: isUser ? "#ffffff" : "#111111",
                          border: isUser ? "none" : "1px solid #dcdcdc",
                        }}
                      >
                        {isUser ? <UserIcon size={10} /> : <LeafIcon size={10} />}
                      </div>

                      <div
                        style={{
                          maxWidth: "100%",
                          padding: "6px 8px",
                          borderRadius: isUser
                            ? "10px 10px 3px 10px"
                            : "10px 10px 10px 3px",
                          fontSize: "10px",
                          lineHeight: 1.45,
                          background: isUser ? "#111111" : "#ffffff",
                          color: isUser ? "#ffffff" : "#111111",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          border: isUser ? "none" : "1px solid #e5e5e5",
                          boxShadow: "0 3px 8px rgba(0,0,0,0.04)",
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: "5px",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "999px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#ffffff",
                        color: "#111111",
                        border: "1px solid #dcdcdc",
                        flexShrink: 0,
                      }}
                    >
                      <LeafIcon size={10} />
                    </div>

                    <div
                      style={{
                        padding: "7px 9px",
                        borderRadius: "10px 10px 10px 3px",
                        background: "#ffffff",
                        border: "1px solid #e5e5e5",
                        display: "flex",
                        alignItems: "center",
                        minWidth: "42px",
                        boxShadow: "0 3px 8px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div className="askai-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                borderTop: "1px solid #efefef",
                background: "#ffffff",
                padding: "8px",
                display: "flex",
                gap: "6px",
                alignItems: "flex-end",
              }}
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask..."
                rows={1}
                style={{
                  flex: 1,
                  resize: "none",
                  padding: "7px 8px",
                  border: "1px solid #d9d9d9",
                  borderRadius: "9px",
                  outline: "none",
                  fontFamily: "inherit",
                  fontSize: "10px",
                  lineHeight: 1.4,
                  minHeight: "32px",
                  maxHeight: "64px",
                  color: "#111111",
                  background: "#ffffff",
                }}
              />

              <button
                onClick={handleSend}
                disabled={loading || !prompt.trim()}
                type="button"
                title="Send"
                style={{
                  width: "32px",
                  height: "32px",
                  border: "none",
                  borderRadius: "9px",
                  background: loading || !prompt.trim() ? "#d6d6d6" : "#111111",
                  color: "#ffffff",
                  cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  padding: 0,
                }}
              >
                <SendIcon size={12} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="askai-glow-btn"
  style={{
    background: "#111111",
    color: "#ffffff",
    border: "none",
    borderRadius: "999px",
    padding: "8px 11px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "11px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
            }}
          >
            <span
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LeafIcon size={10} />
            </span>
            Ask AI
          </button>
        )}
      </div>
    </>
  );
};

export default AskAI;