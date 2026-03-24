import React, { useEffect, useMemo, useRef, useState } from "react";

const AskAI = ({ onApplyAiResult, onViewPlot, contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text:
        "Hello 🙏. I’m your AI assistant for this project. You can ask about available plots, facing, pricing, tree-rich plots, area details, or request filtered results.",
      structured: [],
      actions: [],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const apiUrl = useMemo(() => "/.netlify/functions/ask-ai", []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        textareaRef.current?.focus();
      }, 80);
    }
  }, [isOpen, messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 90)}px`;
  }, [input]);

  const normalizeStructuredContent = (data) => {
    if (!data) return [];
    if (Array.isArray(data.structured)) return data.structured;
    if (Array.isArray(data.sections)) return data.sections;
    return [];
  };

  const normalizeActions = (data) => {
    if (!data) return [];
    if (Array.isArray(data.actions)) return data.actions;
    return [];
  };

  const normalizeAssistantText = (data) => {
    if (!data) return "I’m sorry, I could not process that request properly.";
    if (typeof data.reply === "string" && data.reply.trim()) return data.reply.trim();
    if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
    if (typeof data.text === "string" && data.text.trim()) return data.text.trim();
    return "I’m sorry, I could not process that request properly.";
  };

  const handleActionClick = (action) => {
    if (!action) return;

    if (action.type === "view_plot" && action.plotId) {
      onViewPlot?.(action.plotId);
      return;
    }

    if (
      action.type === "apply_filters" ||
      action.type === "filter" ||
      action.filters ||
      action.resetFilters
    ) {
      onApplyAiResult?.(action);
    }
  };

  const sendMessage = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;

    setError("");

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: prompt,
      structured: [],
      actions: [],
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          context: contextData,
          conversation: nextMessages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      let data = null;

      try {
        data = await response.json();
      } catch {
        throw new Error("Invalid JSON response from server.");
      }

      if (!response.ok) {
        throw new Error(data?.message || "Failed to get AI response.");
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: normalizeAssistantText(data),
        structured: normalizeStructuredContent(data),
        actions: normalizeActions(data),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data?.filters || data?.resetFilters) {
        onApplyAiResult?.(data);
      }
    } catch (err) {
      console.error("AskAI error:", err);

      setError(err.message || "Something went wrong.");

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          text:
            "I’m sorry, the assistant is not available at the moment. Please try again shortly.",
          structured: [],
          actions: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderStructured = (structured) => {
    if (!structured || !structured.length) return null;

    return (
      <div style={styles.structuredWrap}>
        {structured.map((section, index) => (
          <div key={`${section.title || "section"}-${index}`} style={styles.sectionCard}>
            {section.title ? <div style={styles.sectionTitle}>{section.title}</div> : null}

            {Array.isArray(section.items) && section.items.length > 0 ? (
              <div style={styles.sectionItems}>
                {section.items.map((item, itemIndex) => (
                  <div key={`${item}-${itemIndex}`} style={styles.sectionItem}>
                    <span style={styles.sectionBullet} />
                    <span style={styles.sectionItemText}>{item}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {section.description ? (
              <div style={styles.sectionDescription}>{section.description}</div>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const renderActions = (actions) => {
    if (!actions || !actions.length) return null;

    return (
      <div style={styles.actionWrap}>
        {actions.map((action, index) => (
          <button
            key={`${action.type || "action"}-${action.plotId || action.label || index}`}
            type="button"
            onClick={() => handleActionClick(action)}
            style={styles.actionBtn}
          >
            {action.label || "Open"}
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      <div style={styles.launcherShell} data-ui="true">
        {!isOpen && <div style={styles.miniLabel}>nexmap Ai</div>}

        <div style={styles.askaiBtnWrap}>
          <div style={styles.askaiBorderRotate} />
          <div style={styles.askaiInnerMask} />
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            style={styles.askaiGlowBtn}
            aria-label="Open AI Assistant"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              style={styles.askaiBtnIcon}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 3L13.8 8.2L19 10L13.8 11.8L12 17L10.2 11.8L5 10L10.2 8.2L12 3Z"
                fill="currentColor"
              />
              <circle cx="18.5" cy="5.5" r="1.4" fill="currentColor" />
              <circle cx="6" cy="18" r="1.2" fill="currentColor" />
            </svg>

            <span style={styles.liveDot} />
            <span style={styles.askaiBtnText}>Ask AI</span>
            <span style={styles.askaiBtnBadge}>LIVE</span>
          </button>
          <span style={styles.askaiBtnSubtle} />
        </div>
      </div>

      {isOpen && (
        <div style={styles.overlay} data-ui="true" onClick={() => setIsOpen(false)}>
          <div style={styles.chatPanel} onClick={(e) => e.stopPropagation()} data-ui="true">
            <div style={styles.chatHeader}>
              <div style={styles.chatHeaderLeft}>
                <div style={styles.headerIconWrap}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    style={styles.headerIcon}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 3L13.8 8.2L19 10L13.8 11.8L12 17L10.2 11.8L5 10L10.2 8.2L12 3Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={styles.chatTitle}>Project AI Assistant</div>
                  <div style={styles.chatSubTitle}>
                    Smart plot discovery, filters and pricing support
                  </div>
                </div>
              </div>

              <button type="button" onClick={() => setIsOpen(false)} style={styles.closeBtn}>
                ×
              </button>
            </div>

            <div style={styles.chatBody}>
              <div style={styles.messageList}>
                {messages.map((msg) => {
                  const isUser = msg.role === "user";

                  return (
                    <div
                      key={msg.id}
                      style={{
                        ...styles.messageRow,
                        justifyContent: isUser ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          ...styles.messageBubble,
                          ...(isUser ? styles.userBubble : styles.assistantBubble),
                        }}
                      >
                        {!isUser && (
                          <div style={styles.assistantLabelRow}>
                            <span style={styles.assistantDot} />
                            <span style={styles.assistantLabel}>AI Executive Assistant</span>
                          </div>
                        )}

                        <div
                          style={{
                            ...styles.messageText,
                            color: isUser ? "#ffffff" : "#111827",
                          }}
                        >
                          {msg.text}
                        </div>

                        {!isUser ? renderStructured(msg.structured) : null}
                        {!isUser ? renderActions(msg.actions) : null}
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div style={styles.messageRow}>
                    <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
                      <div style={styles.assistantLabelRow}>
                        <span style={styles.assistantDot} />
                        <span style={styles.assistantLabel}>AI Executive Assistant</span>
                      </div>

                      <div style={styles.typingRow}>
                        <span style={{ ...styles.typingDot, animationDelay: "0s" }} />
                        <span style={{ ...styles.typingDot, animationDelay: "0.15s" }} />
                        <span style={{ ...styles.typingDot, animationDelay: "0.3s" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {error ? <div style={styles.errorBar}>{error}</div> : null}

            <div style={styles.inputArea}>
              <div style={styles.inputWrap}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about plots, facing, price, area or trees..."
                  style={styles.textarea}
                  rows={1}
                />

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  style={{
                    ...styles.sendBtn,
                    opacity: loading || !input.trim() ? 0.55 : 1,
                    cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    style={styles.sendIcon}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 20L21 12L3 4V10L15 12L3 14V20Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes askai-spin-border {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes askai-pulse-dot {
          0% { box-shadow: 0 0 0 0 rgba(0,255,157,0.7); }
          70% { box-shadow: 0 0 0 8px rgba(0,255,157,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,255,157,0); }
        }

        @keyframes askai-typing {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.45; }
          40% { transform: scale(1); opacity: 1; }
        }

        @media (max-width: 768px) {
          textarea {
            font-size: 16px;
          }
        }
      `}</style>
    </>
  );
};

const styles = {
  launcherShell: {
    position: "fixed",
    right: "14px",
    bottom: "14px",
    zIndex: 2000,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "6px",
    pointerEvents: "auto",
  },

  miniLabel: {
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    color: "rgba(255,255,255,0.82)",
    background: "rgba(12,12,12,0.74)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "4px 8px",
    borderRadius: "999px",
    backdropFilter: "blur(8px)",
    whiteSpace: "nowrap",
  },

  askaiBtnWrap: {
    position: "relative",
    display: "inline-flex",
    borderRadius: "15px",
    padding: "2px",
    overflow: "hidden",
    isolation: "isolate",
    minWidth: "118px",
  },

  askaiBorderRotate: {
    position: "absolute",
    inset: "-130%",
    background:
      "conic-gradient(from 0deg, #ff004c, #ff7a00, #ffe600, #00ff85, #00e5ff, #4d5bff, #b300ff, #ff004c)",
    animation: "askai-spin-border 3s linear infinite",
    zIndex: 0,
  },

  askaiInnerMask: {
    position: "absolute",
    inset: "2px",
    background: "rgba(255, 255, 255, 0.96)",
    borderRadius: "13px",
    zIndex: 1,
  },

  askaiGlowBtn: {
    position: "relative",
    zIndex: 2,
    border: "none",
    outline: "none",
    background: "linear-gradient(180deg, #c5c5c5 0%, #ffffff 100%)",
    color: "#000000",
    borderRadius: "13px",
    padding: "9px 12px",
    minWidth: "118px",
    height: "40px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.2px",
    cursor: "pointer",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.3)",
  },

  askaiBtnIcon: {
    width: "14px",
    height: "14px",
    color: "#000000",
    flexShrink: 0,
  },

  askaiBtnText: {
    lineHeight: 1,
    fontSize: "12px",
  },

  askaiBtnBadge: {
    fontSize: "8px",
    fontWeight: 800,
    padding: "2px 6px",
    borderRadius: "999px",
    color: "#ffffff",
    background: "linear-gradient(90deg, #000000 0%, #000000 100%)",
  },

  liveDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#15ff00",
    boxShadow: "0 0 0 rgba(60, 255, 0, 0.71)",
    animation: "askai-pulse-dot 1.8s infinite",
    flexShrink: 0,
  },

  askaiBtnSubtle: {
    position: "absolute",
    left: "8px",
    right: "8px",
    bottom: "5px",
    height: "1px",
    background:
      "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
    opacity: 0.7,
    zIndex: 2,
    pointerEvents: "none",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 2200,
    background: "rgba(0,0,0,0.14)",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: "10px",
  },

  chatPanel: {
    width: "min(340px, calc(100vw - 16px))",
    height: "min(520px, 72vh)",
    background: "rgba(255,255,255,0.98)",
    borderRadius: "18px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  },

  chatHeader: {
    padding: "10px 10px 9px 10px",
    borderBottom: "1px solid rgba(17,24,39,0.08)",
    background: "linear-gradient(180deg, #111111 0%, #1b1b1b 100%)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },

  chatHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },

  headerIconWrap: {
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))",
    border: "1px solid rgba(255,255,255,0.12)",
    flexShrink: 0,
  },

  headerIcon: {
    width: "15px",
    height: "15px",
    color: "#ffffff",
  },

  chatTitle: {
    fontSize: "12px",
    fontWeight: 800,
    lineHeight: 1.2,
  },

  chatSubTitle: {
    fontSize: "10px",
    color: "rgba(255,255,255,0.72)",
    marginTop: "2px",
    lineHeight: 1.3,
  },

  closeBtn: {
    width: "30px",
    height: "30px",
    borderRadius: "9px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    fontSize: "18px",
    cursor: "pointer",
    flexShrink: 0,
  },

  chatBody: {
    flex: 1,
    overflowY: "auto",
    padding: "10px",
    background:
      "radial-gradient(circle at top, rgba(244,244,245,0.98), rgba(255,255,255,1))",
    WebkitOverflowScrolling: "touch",
  },

  messageList: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },

  messageRow: {
    display: "flex",
    width: "100%",
  },

  messageBubble: {
    maxWidth: "90%",
    borderRadius: "15px",
    padding: "9px 10px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
  },

  assistantBubble: {
    background: "#ffffff",
    border: "1px solid rgba(17,24,39,0.06)",
  },

  userBubble: {
    background: "linear-gradient(135deg, #111111, #1d1d1d)",
    border: "1px solid rgba(255,255,255,0.06)",
  },

  assistantLabelRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "6px",
  },

  assistantDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#00d084",
    flexShrink: 0,
  },

  assistantLabel: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    color: "#4b5563",
  },

  messageText: {
    fontSize: "12px",
    lineHeight: 1.4,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  structuredWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginTop: "8px",
  },

  sectionCard: {
    background: "#f9fafb",
    border: "1px solid rgba(17,24,39,0.06)",
    borderRadius: "11px",
    padding: "9px",
  },

  sectionTitle: {
    fontSize: "11px",
    fontWeight: 800,
    color: "#111827",
    marginBottom: "7px",
  },

  sectionItems: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  sectionItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "7px",
  },

  sectionBullet: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#111827",
    marginTop: "5px",
    flexShrink: 0,
  },

  sectionItemText: {
    fontSize: "11px",
    lineHeight: 1.4,
    color: "#1f2937",
  },

  sectionDescription: {
    fontSize: "11px",
    lineHeight: 1.4,
    color: "#374151",
  },

  actionWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
    marginTop: "8px",
  },

  actionBtn: {
    border: "1px solid rgba(17,24,39,0.08)",
    background: "#111111",
    color: "#ffffff",
    borderRadius: "999px",
    padding: "7px 10px",
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },

  typingRow: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    paddingTop: "2px",
  },

  typingDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#111827",
    animation: "askai-typing 1.2s infinite ease-in-out",
  },

  errorBar: {
    padding: "7px 10px",
    fontSize: "11px",
    color: "#b91c1c",
    background: "#fef2f2",
    borderTop: "1px solid #fee2e2",
  },

  inputArea: {
    padding: "9px",
    borderTop: "1px solid rgba(17,24,39,0.08)",
    background: "#ffffff",
  },

  inputWrap: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    background: "#f9fafb",
    border: "1px solid rgba(17,24,39,0.08)",
    borderRadius: "14px",
    padding: "8px",
  },

  textarea: {
    flex: 1,
    border: "none",
    outline: "none",
    resize: "none",
    background: "transparent",
    fontSize: "12px",
    lineHeight: 1.4,
    color: "#111827",
    fontFamily: "inherit",
    minHeight: "20px",
    maxHeight: "90px",
    overflowY: "auto",
  },

  sendBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "12px",
    border: "none",
    outline: "none",
    background: "linear-gradient(135deg, #111111, #2a2a2a)",
    color: "#ffffff",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  sendIcon: {
    width: "15px",
    height: "15px",
    color: "#ffffff",
  },
};

export default AskAI;