// netlify/functions/ask-ai.js

export default async (req) => {
  const jsonHeaders = { "Content-Type": "application/json" };

  const send = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: jsonHeaders,
    });

  const baseResponse = (message = "") => ({
    allowed: true,
    message,
    matchingPlotIds: [],
    focusPlotId: null,
    filters: {
      status: null,
      facing: null,
    },
    actions: [],
  });

  const normalizeHistory = (history) => {
    if (!Array.isArray(history)) return [];

    return history
      .filter(
        (msg) =>
          msg &&
          typeof msg === "object" &&
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string" &&
          msg.content.trim()
      )
      .slice(-12)
      .map((msg) => ({
        role: msg.role,
        content: msg.content.trim(),
      }));
  };

  const extractJson = (text) => {
    const raw = String(text || "").trim();
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {}

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {}

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const possibleJson = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(possibleJson);
      } catch {}
    }

    return null;
  };

  const normalizeFilters = (filters) => ({
    status:
      typeof filters?.status === "string" && filters.status.trim()
        ? filters.status.trim()
        : null,
    facing:
      typeof filters?.facing === "string" && filters.facing.trim()
        ? filters.facing.trim()
        : null,
  });

  const normalizeActions = (actions) => {
    if (!Array.isArray(actions)) return [];

    return actions
      .map((action) => {
        if (!action || typeof action !== "object") return null;

        if (action.type === "view_plot") {
          if (typeof action.plotId !== "string" || !action.plotId.trim()) {
            return null;
          }

          return {
            type: "view_plot",
            label:
              typeof action.label === "string" && action.label.trim()
                ? action.label.trim()
                : "View Plot",
            plotId: action.plotId.trim(),
          };
        }

        if (action.type === "apply_filter") {
          return {
            type: "apply_filter",
            label:
              typeof action.label === "string" && action.label.trim()
                ? action.label.trim()
                : "Apply Filter",
            filters: normalizeFilters(action.filters || {}),
          };
        }

        if (action.type === "reset_filters") {
          return {
            type: "reset_filters",
            label:
              typeof action.label === "string" && action.label.trim()
                ? action.label.trim()
                : "Clear Filters",
          };
        }

        return null;
      })
      .filter(Boolean);
  };

  const flattenPlots = (context) => {
    if (!context) return [];

    if (Array.isArray(context)) return context.filter(Boolean);

    if (Array.isArray(context?.plots)) return context.plots.filter(Boolean);
    if (Array.isArray(context?.plotData)) return context.plotData.filter(Boolean);
    if (Array.isArray(context?.allPlots)) return context.allPlots.filter(Boolean);
    if (Array.isArray(context?.availablePlots)) return context.availablePlots.filter(Boolean);

    return [];
  };

  const getPlotId = (plot, index) =>
    plot?.plotId ||
    plot?.id ||
    plot?.docId ||
    plot?.projectId ||
    `plot-${index + 1}`;

  const getPlotNumber = (plot, index) =>
    plot?.plotNumber ||
    plot?.plotNo ||
    plot?.plot_name ||
    plot?.name ||
    plot?.title ||
    `Plot ${index + 1}`;

  const getPlotLabel = (plot, index) => {
    const plotNumber = getPlotNumber(plot, index);
    const block = plot?.blockName || plot?.block || plot?.phase || "";
    return block ? `${plotNumber} - ${block}` : plotNumber;
  };

  const normalizeFacingValue = (value) => {
    const v = String(value || "").trim().toUpperCase();

    if (v === "E" || v === "EAST") return "E";
    if (v === "W" || v === "WEST") return "W";
    if (v === "N" || v === "NORTH") return "N";
    if (v === "S" || v === "SOUTH") return "S";

    return null;
  };

  const normalizeStatusValue = (value) => {
    const v = String(value || "").trim().toLowerCase();

    if (v === "available") return "Available";
    if (v === "sold") return "Sold";
    if (v === "booked") return "Booked";
    if (v === "reserved") return "Reserved";
    if (v === "reserve") return "Reserved";

    return null;
  };

  const getTreeCount = (plot) => {
    const candidates = [
      plot?.treeCount,
      plot?.trees,
      plot?.totalTrees,
      plot?.tree_count,
      plot?.noOfTrees,
      plot?.tree,
    ];

    for (const value of candidates) {
      const num = Number(value);
      if (Number.isFinite(num)) return num;
    }

    return null;
  };

  const getArea = (plot) => {
    const candidates = [
      plot?.areaSqFt,
      plot?.sqft,
      plot?.sqFt,
      plot?.plotArea,
      plot?.area,
    ];

    for (const value of candidates) {
      const num = Number(value);
      if (Number.isFinite(num)) return num;
    }

    return null;
  };

  const detectGreeting = (prompt) => {
    const text = String(prompt || "").trim().toLowerCase();

    const map = {
      hi: "Welcome. I’m here to assist you with plot details, pricing, availability, tree details, and project insights. How may I help you?",
      hello:
        "Welcome. I’m here to assist you with plot details, pricing, availability, tree details, and project insights. How may I help you?",
      hey: "Welcome. I’m here to assist you with plot details, pricing, availability, tree details, and project insights. How may I help you?",
      "good morning":
        "Good morning. I’m here to assist you with project details, plot availability, pricing, and related information. How may I help you?",
      "good afternoon":
        "Good afternoon. I’m here to assist you with project details, plot availability, pricing, and related information. How may I help you?",
      "good evening":
        "Good evening. I’m here to assist you with project details, plot availability, pricing, and related information. How may I help you?",
      "how are you":
        "I’m doing well, thank you. I’m here to assist you with plot availability, pricing, facing, tree details, and project information. How may I help you?",
      "how are you?":
        "I’m doing well, thank you. I’m here to assist you with plot availability, pricing, facing, tree details, and project information. How may I help you?",
      "who are you":
        "I’m your digital sales executive for this project. I can assist with plot details, pricing, availability, facing, tree details, and project highlights.",
      "who are you?":
        "I’m your digital sales executive for this project. I can assist with plot details, pricing, availability, facing, tree details, and project highlights.",
      thanks:
        "You’re welcome. I’m here whenever you need help with plot details or project information.",
      "thank you":
        "You’re welcome. I’m here whenever you need help with plot details or project information.",
    };

    return map[text] || null;
  };

  const handleDirectQuery = (prompt, context) => {
    const text = String(prompt || "").trim().toLowerCase();
    const plots = flattenPlots(context);

    const greeting = detectGreeting(text);
    if (greeting) {
      return baseResponse(greeting);
    }

    if (!plots.length) {
      return null;
    }

    const actions = [];
    const matchingPlotIds = [];

    const facingMap = [
      { keyword: "north", value: "N", label: "north facing" },
      { keyword: "south", value: "S", label: "south facing" },
      { keyword: "east", value: "E", label: "east facing" },
      { keyword: "west", value: "W", label: "west facing" },
    ];

    for (const item of facingMap) {
      if (text.includes(item.keyword) && (text.includes("plot") || text.includes("plots") || text.includes("facing"))) {
        const matched = plots.filter(
          (plot) => normalizeFacingValue(plot?.facing) === item.value
        );

        const top = matched.slice(0, 5);
        top.forEach((plot, index) => {
          const plotId = getPlotId(plot, index);
          matchingPlotIds.push(plotId);
          actions.push({
            type: "view_plot",
            label: `View ${getPlotLabel(plot, index)}`,
            plotId,
          });
        });

        actions.push({
          type: "apply_filter",
          label: `Show ${item.label} plots`,
          filters: { status: null, facing: item.value },
        });

        return {
          allowed: true,
          message: matched.length
            ? `Certainly. I found ${matched.length} ${item.label} plot${matched.length > 1 ? "s" : ""}. You can view the relevant options below.`
            : `I could not find any ${item.label} plots in the current project data.`,
          matchingPlotIds,
          focusPlotId: null,
          filters: {
            status: null,
            facing: item.value,
          },
          actions,
        };
      }
    }

    const statusMap = [
      { keyword: "available", value: "Available", label: "available" },
      { keyword: "sold", value: "Sold", label: "sold" },
      { keyword: "booked", value: "Booked", label: "booked" },
      { keyword: "reserved", value: "Reserved", label: "reserved" },
    ];

    for (const item of statusMap) {
      if (text.includes(item.keyword) && (text.includes("plot") || text.includes("plots") || text.includes("show"))) {
        const matched = plots.filter(
          (plot) => normalizeStatusValue(plot?.status || plot?.Status) === item.value
        );

        const top = matched.slice(0, 5);
        top.forEach((plot, index) => {
          const plotId = getPlotId(plot, index);
          matchingPlotIds.push(plotId);
          actions.push({
            type: "view_plot",
            label: `View ${getPlotLabel(plot, index)}`,
            plotId,
          });
        });

        actions.push({
          type: "apply_filter",
          label: `Show ${item.label} plots`,
          filters: { status: item.value, facing: null },
        });

        return {
          allowed: true,
          message: matched.length
            ? `Certainly. I found ${matched.length} ${item.label} plot${matched.length > 1 ? "s" : ""}. You can review the relevant options below.`
            : `I could not find any ${item.label} plots in the current project data.`,
          matchingPlotIds,
          focusPlotId: null,
          filters: {
            status: item.value,
            facing: null,
          },
          actions,
        };
      }
    }

    if (text.includes("less trees") || text.includes("least trees") || text.includes("fewer trees")) {
      const withTrees = plots
        .map((plot, index) => ({
          plot,
          index,
          treeCount: getTreeCount(plot),
        }))
        .filter((item) => item.treeCount !== null)
        .sort((a, b) => a.treeCount - b.treeCount);

      const top = withTrees.slice(0, 5);

      top.forEach((item) => {
        const plotId = getPlotId(item.plot, item.index);
        matchingPlotIds.push(plotId);
        actions.push({
          type: "view_plot",
          label: `View ${getPlotLabel(item.plot, item.index)} • ${item.treeCount} trees`,
          plotId,
        });
      });

      return {
        allowed: true,
        message: top.length
          ? `Certainly. Here are the plots with lower tree counts from the current project data.`
          : `Tree count details are not available in the current project data.`,
        matchingPlotIds,
        focusPlotId: null,
        filters: {
          status: null,
          facing: null,
        },
        actions,
      };
    }

    if (text.includes("more trees") || text.includes("most trees") || text.includes("higher trees")) {
      const withTrees = plots
        .map((plot, index) => ({
          plot,
          index,
          treeCount: getTreeCount(plot),
        }))
        .filter((item) => item.treeCount !== null)
        .sort((a, b) => b.treeCount - a.treeCount);

      const top = withTrees.slice(0, 5);

      top.forEach((item) => {
        const plotId = getPlotId(item.plot, item.index);
        matchingPlotIds.push(plotId);
        actions.push({
          type: "view_plot",
          label: `View ${getPlotLabel(item.plot, item.index)} • ${item.treeCount} trees`,
          plotId,
        });
      });

      return {
        allowed: true,
        message: top.length
          ? `Certainly. Here are the plots with higher tree counts from the current project data.`
          : `Tree count details are not available in the current project data.`,
        matchingPlotIds,
        focusPlotId: null,
        filters: {
          status: null,
          facing: null,
        },
        actions,
      };
    }

    if (text.includes("premium")) {
      const ranked = plots
        .map((plot, index) => {
          const area = getArea(plot) || 0;
          const trees = getTreeCount(plot) || 0;
          const facing = normalizeFacingValue(plot?.facing);
          const score =
            area +
            trees * 10 +
            (plot?.corner === "Yes" || plot?.corner === true ? 300 : 0) +
            (plot?.parkFacing === "Yes" || plot?.parkFacing === true ? 250 : 0) +
            (facing === "E" || facing === "N" ? 150 : 0);

          return { plot, index, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      ranked.forEach((item) => {
        const plotId = getPlotId(item.plot, item.index);
        matchingPlotIds.push(plotId);
        actions.push({
          type: "view_plot",
          label: `View ${getPlotLabel(item.plot, item.index)}`,
          plotId,
        });
      });

      return {
        allowed: true,
        message: ranked.length
          ? `Certainly. Here are some premium plot options based on the available project details.`
          : `I could not identify premium plot options from the current project data.`,
        matchingPlotIds,
        focusPlotId: null,
        filters: {
          status: null,
          facing: null,
        },
        actions,
      };
    }

    return null;
  };

  try {
    if (req.method !== "POST") {
      return send(
        {
          allowed: false,
          message: "Method not allowed.",
          matchingPlotIds: [],
          focusPlotId: null,
          filters: { status: null, facing: null },
          actions: [],
        },
        405
      );
    }

    const { prompt, context, history = [] } = await req.json();

    if (!prompt || !String(prompt).trim()) {
      return send(
        {
          allowed: false,
          message: "Prompt is required.",
          matchingPlotIds: [],
          focusPlotId: null,
          filters: { status: null, facing: null },
          actions: [],
        },
        400
      );
    }

    const trimmedPrompt = String(prompt).trim();

    // Direct handling for common queries
    const directResponse = handleDirectQuery(trimmedPrompt, context);
    if (directResponse) {
      return send(directResponse);
    }

    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
      return send(
        {
          allowed: false,
          message: "Missing NVIDIA_API_KEY in Netlify environment variables.",
          matchingPlotIds: [],
          focusPlotId: null,
          filters: { status: null, facing: null },
          actions: [],
        },
        500
      );
    }

    const chatHistory = normalizeHistory(history);

    const systemPrompt = `
You are a professional real-estate sales executive assistant for a plotted development application.

Rules:
- Answer ONLY from the provided project data context and conversation history
- Never invent plot details, pricing, tree counts, or project facts
- Use a professional, warm, respectful, neutral tone
- Do not use words like sir or madam
- Keep the message concise and clear
- For greetings, respond naturally
- For follow-up questions like "show more like that", use previous conversation context carefully
- If previous context is unclear, say so politely

UI rules:
- focusPlotId must always be null
- Do not auto-open plots
- Use actions when relevant

Valid action formats:
{
  "type": "view_plot",
  "label": "View Plot 20",
  "plotId": "plot-20"
}

{
  "type": "apply_filter",
  "label": "Show east facing plots",
  "filters": {
    "status": null,
    "facing": "E"
  }
}

{
  "type": "reset_filters",
  "label": "Clear Filters"
}

Return ONLY valid JSON in exactly this shape:
{
  "allowed": true,
  "message": "string",
  "matchingPlotIds": [],
  "focusPlotId": null,
  "filters": {
    "status": null,
    "facing": null
  },
  "actions": []
}

Do not use markdown.
Do not use code fences.
Do not add explanation outside JSON.
`.trim();

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "system",
        content: `Project data context:\n${JSON.stringify({ context })}`,
      },
      ...chatHistory,
      { role: "user", content: trimmedPrompt },
    ];

    const upstreamRes = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages,
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 900,
          stream: false,
        }),
      }
    );

    let upstreamData = {};
    try {
      upstreamData = await upstreamRes.json();
    } catch {
      return send(baseResponse("Sorry, I couldn’t read the AI response properly. Please try again."));
    }

    if (!upstreamRes.ok) {
      return send(
        baseResponse(
          upstreamData?.error?.message ||
            upstreamData?.message ||
            "Unable to connect to AI at the moment."
        ),
        500
      );
    }

    const rawContent = upstreamData?.choices?.[0]?.message?.content || "";
    const parsed = extractJson(rawContent);

    if (!parsed || typeof parsed !== "object") {
      return send(
        baseResponse(
          "I’m here to assist with plot details, pricing, facing, tree information, and project highlights. Please try rephrasing your request."
        )
      );
    }

    const normalized = {
      allowed: typeof parsed.allowed === "boolean" ? parsed.allowed : true,
      message:
        typeof parsed.message === "string" && parsed.message.trim()
          ? parsed.message.trim()
          : "I’m here to assist with project and plot information.",
      matchingPlotIds: Array.isArray(parsed.matchingPlotIds)
        ? parsed.matchingPlotIds.filter(
            (id) => typeof id === "string" && id.trim()
          )
        : [],
      focusPlotId: null,
      filters: normalizeFilters(parsed.filters || {}),
      actions: normalizeActions(parsed.actions || []),
    };

    return send(normalized);
  } catch (error) {
    return send(
      {
        allowed: false,
        message: error?.message || "Unexpected server error.",
        matchingPlotIds: [],
        focusPlotId: null,
        filters: { status: null, facing: null },
        actions: [],
      },
      500
    );
  }
};