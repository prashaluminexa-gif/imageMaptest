import React, { useState, useRef, useEffect } from "react";

const AskAI = ({ onApplyAiResult, onViewPlot, contextData }) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Welcome. I’m here to assist you with plot details, pricing, availability, tree details, and project insights. How may I help you?",
      actions: [],
    },
  ]);
  const [inputRows, setInputRows] = useState(1);

  const messagesRef = useRef(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  const stopEvent = (e) => {
    e.stopPropagation();
  };

  const appendAssistantMessage = (content, actions = []) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content,
        actions,
      },
    ]);
  };

  const buildHistoryForApi = (nextUserPrompt) => {
    const history = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    history.push({
      role: "user",
      content: nextUserPrompt,
    });

    return history.slice(-12);
  };

  const handleSend = async (manualPrompt) => {
    const finalPrompt = typeof manualPrompt === "string" ? manualPrompt : prompt;
    const trimmedPrompt = finalPrompt.trim();

    if (!trimmedPrompt || loading) return;

    const userMessage = { role: "user", content: trimmedPrompt };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setInputRows(1);
    setLoading(true);

    try {
      const history = buildHistoryForApi(trimmedPrompt);

      const res = await fetch("/.netlify/functions/ask-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          context: contextData,
          history,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("Invalid response from AI function.");
      }

      if (!res.ok) {
        throw new Error(data.message || "Failed to connect to AI.");
      }

      appendAssistantMessage(
        typeof data.message === "string" && data.message.trim()
          ? data.message.trim()
          : "I’m here to assist you with project details, plot availability, pricing, and tree information.",
        Array.isArray(data.actions) ? data.actions : []
      );

      if (data.allowed && typeof onApplyAiResult === "function") {
        onApplyAiResult(data);
      }
    } catch (error) {
      console.error("AskAI error:", error);
      appendAssistantMessage(
        "Sorry, I couldn’t respond properly just now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Welcome. I’m here to assist you with plot details, pricing, availability, tree details, and project insights. How may I help you?",
        actions: [],
      },
    ]);
    setPrompt("");
    setInputRows(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    const value = e.target.value;
    setPrompt(value);

    const lineBreaks = value.split("\n").length;
    setInputRows(Math.min(3, Math.max(1, lineBreaks)));
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
        @keyframes askaiGlow {
          0% {
            box-shadow:
              0 0 0 0 rgba(255,255,255,0.10),
              0 0 0 0 rgba(255,255,255,0.08);
          }
          50% {
            box-shadow:
              0 0 0 3px rgba(255,255,255,0.08),
              0 0 14px 2px rgba(255,255,255,0.18);
          }
          100% {
            box-shadow:
              0 0 0 0 rgba(255,255,255,0.10),
              0 0 0 0 rgba(255,255,255,0.08);
          }
        }
        .askai-glow-btn {
          animation: askaiGlow 2s infinite ease-in-out;
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
            onWheel={stopEvent}
            style={{
              width: "285px",
              height: "420px",
              background: "#ffffff",
              borderRadius: "18px",
              boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid #e5e5e5",
            }}
          >
            <div
              style={{
                padding: "10px 11px",
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
                  gap: "7px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    width: "23px",
                    height: "23px",
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
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                  <span>Ask AI</span>
                  <span style={{ fontSize: "9px", opacity: 0.72 }}>
                    Sales Executive
                  </span>
                </div>
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
              onTouchStart={stopEvent}
              onWheel={stopEvent}
              style={{
                flex: 1,
                padding: "9px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                overflowY: "auto",
                overflowX: "hidden",
                background: "linear-gradient(to bottom, #ffffff 0%, #fbfbfb 100%)",
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
                touchAction: "pan-y",
                position: "relative",
              }}
            >
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
                        maxWidth: "94%",
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
                          padding: "8px 10px",
                          borderRadius: isUser
                            ? "10px 10px 3px 10px"
                            : "10px 10px 10px 3px",
                          fontSize: "10px",
                          lineHeight: 1.55,
                          background: isUser ? "#111111" : "#ffffff",
                          color: isUser ? "#ffffff" : "#111111",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          border: isUser ? "none" : "1px solid #e5e5e5",
                          boxShadow: "0 3px 8px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div>{msg.content}</div>

                        {!isUser && Array.isArray(msg.actions) && msg.actions.length > 0 && (
                          <div
                            style={{
                              marginTop: "9px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                            }}
                          >
                            {msg.actions.map((action, actionIndex) => {
                              if (action.type === "view_plot") {
                                return (
                                  <button
                                    key={`${action.type}-${actionIndex}`}
                                    type="button"
                                    onClick={() => onViewPlot?.(action.plotId)}
                                    style={{
                                      border: "none",
                                      background: "#111111",
                                      color: "#ffffff",
                                      padding: "8px 10px",
                                      borderRadius: "8px",
                                      fontSize: "10px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      textAlign: "left",
                                    }}
                                  >
                                    {action.label || "View plot"}
                                  </button>
                                );
                              }

                              if (action.type === "apply_filter") {
                                return (
                                  <button
                                    key={`${action.type}-${actionIndex}`}
                                    type="button"
                                    onClick={() =>
                                      onApplyAiResult?.({
                                        filters: action.filters || {},
                                      })
                                    }
                                    style={{
                                      border: "1px solid #d1d5db",
                                      background: "#ffffff",
                                      color: "#111111",
                                      padding: "8px 10px",
                                      borderRadius: "8px",
                                      fontSize: "10px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      textAlign: "left",
                                    }}
                                  >
                                    {action.label || "Apply filter"}
                                  </button>
                                );
                              }

                              if (action.type === "reset_filters") {
                                return (
                                  <button
                                    key={`${action.type}-${actionIndex}`}
                                    type="button"
                                    onClick={() =>
                                      onApplyAiResult?.({
                                        resetFilters: true,
                                      })
                                    }
                                    style={{
                                      border: "1px solid #d1d5db",
                                      background: "#ffffff",
                                      color: "#111111",
                                      padding: "8px 10px",
                                      borderRadius: "8px",
                                      fontSize: "10px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      textAlign: "left",
                                    }}
                                  >
                                    {action.label || "Clear filters"}
                                  </button>
                                );
                              }

                              return null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "5px" }}>
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
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  alignItems: "flex-end",
                }}
              >
                <textarea
                  value={prompt}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about plots, pricing, trees, project..."
                  rows={inputRows}
                  style={{
                    flex: 1,
                    resize: "none",
                    padding: "8px 9px",
                    border: "1px solid #d9d9d9",
                    borderRadius: "10px",
                    outline: "none",
                    fontFamily: "inherit",
                    fontSize: "10px",
                    lineHeight: 1.45,
                    minHeight: "34px",
                    maxHeight: "72px",
                    color: "#111111",
                    background: "#ffffff",
                  }}
                />

                <button
                  onClick={() => handleSend()}
                  disabled={loading || !prompt.trim()}
                  type="button"
                  title="Send"
                  style={{
                    width: "34px",
                    height: "34px",
                    border: "none",
                    borderRadius: "10px",
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