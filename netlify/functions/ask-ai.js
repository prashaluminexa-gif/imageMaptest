// netlify/functions/ask-ai.js

export default async (req) => {
  const jsonHeaders = { "Content-Type": "application/json" };

  const send = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: jsonHeaders,
    });

  const buildFallback = () => ({
    allowed: true,
    message:
      "Certainly. I’m ready to assist with plot availability, pricing, facing, tree details, and project highlights.",
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

  try {
    if (req.method !== "POST") {
      return send(
        {
          allowed: false,
          message: "Method not allowed.",
          matchingPlotIds: [],
          focusPlotId: null,
          filters: {
            status: null,
            facing: null,
          },
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
          filters: {
            status: null,
            facing: null,
          },
          actions: [],
        },
        400
      );
    }

    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
      return send(
        {
          allowed: false,
          message: "Missing NVIDIA_API_KEY in Netlify environment variables.",
          matchingPlotIds: [],
          focusPlotId: null,
          filters: {
            status: null,
            facing: null,
          },
          actions: [],
        },
        500
      );
    }

    const safeFallback = buildFallback();
    const chatHistory = normalizeHistory(history);
    const trimmedPrompt = String(prompt).trim();

    const systemPrompt = `
You are a professional real-estate sales executive assistant for a plotted development application.

Your role:
- Assist users with project details, plot availability, facing, pricing, area, trees, highlights, comparisons, and related project information.
- Answer ONLY from the provided project data context and conversation history.
- Never invent any pricing, plot details, project facts, tree counts, or company information.

Tone rules:
- Professional
- Warm
- Respectful
- Neutral
- Do not use gender-based words like sir or madam
- Speak like a polished real-estate sales executive
- Keep responses concise, helpful, and premium

Conversation rules:
- Understand natural follow-up replies
- Resolve phrases like:
  - show more like that
  - similar plots
  - continue
  - compare with that
  - show other similar plots
  - that was good
  - show more
- Use previous conversation context carefully
- If previous context is unclear, politely say so

Greeting rules:
- Greetings like hello, hi, hey, good morning, good evening, thanks, thank you, and how are you are valid and should receive a warm professional response

Project behavior:
- For plot suggestions, mention benefits only if available in data
- For tree-related queries, mention counts or names only if available
- For pricing queries, mention only available pricing values
- For comparisons, compare only using available context data
- If data is missing, clearly say it is not available in the current project data

UI rules:
- focusPlotId must always be null
- Do not auto-open any plot
- When relevant, return action buttons

Valid action button formats:

For viewing a plot:
{
  "type": "view_plot",
  "label": "View Plot 20",
  "plotId": "plot-20"
}

For applying a filter:
{
  "type": "apply_filter",
  "label": "Show east facing plots",
  "filters": {
    "status": null,
    "facing": "E"
  }
}

For resetting filters:
{
  "type": "reset_filters",
  "label": "Clear Filters"
}

Return format:
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

Rules:
- allowed should be true for in-scope queries and greetings
- message must always be plain readable text for chat UI
- matchingPlotIds must always be an array
- focusPlotId must always be null
- filters must contain only status and facing
- actions must always be an array

Filter mapping:
- east => E
- west => W
- north => N
- south => S
- available => Available
- sold => Sold
- booked => Booked
- reserved => Reserved

Critical output rule:
- Return JSON only
- Do not wrap JSON in markdown
- Do not add explanation before or after JSON
- Do not use code fences
`.trim();

    const contextMessage = {
      role: "system",
      content: `Here is the project data context in JSON. Use only this data and the chat history:\n${JSON.stringify(
        { context }
      )}`,
    };

    const messages = [
      { role: "system", content: systemPrompt },
      contextMessage,
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
          temperature: 0.2,
          top_p: 0.9,
          max_tokens: 1200,
          stream: false,
          response_format: { type: "json_object" },
        }),
      }
    );

    let upstreamData = {};
    try {
      upstreamData = await upstreamRes.json();
    } catch {
      return send(
        {
          allowed: false,
          message: "Invalid response received from NVIDIA API.",
          matchingPlotIds: [],
          focusPlotId: null,
          filters: {
            status: null,
            facing: null,
          },
          actions: [],
        },
        500
      );
    }

    if (!upstreamRes.ok) {
      return send(
        {
          allowed: false,
          message:
            upstreamData?.error?.message ||
            upstreamData?.message ||
            "Failed to connect to NVIDIA API.",
          matchingPlotIds: [],
          focusPlotId: null,
          filters: {
            status: null,
            facing: null,
          },
          actions: [],
        },
        500
      );
    }

    const rawContent = upstreamData?.choices?.[0]?.message?.content || "";
    const parsed = extractJson(rawContent);

    if (!parsed || typeof parsed !== "object") {
      return send({
        ...safeFallback,
        message:
          "Sorry, I couldn’t structure that response properly. Please ask again about plots, pricing, facing, tree details, or project information.",
      });
    }

    const normalized = {
      allowed: typeof parsed.allowed === "boolean" ? parsed.allowed : true,
      message:
        typeof parsed.message === "string" && parsed.message.trim()
          ? parsed.message.trim()
          : safeFallback.message,
      matchingPlotIds: Array.isArray(parsed.matchingPlotIds)
        ? parsed.matchingPlotIds.filter(
            (id) => typeof id === "string" && id.trim()
          )
        : [],
      focusPlotId: null,
      filters: normalizeFilters(parsed.filters || {}),
      actions: normalizeActions(parsed.actions),
    };

    return send(normalized);
  } catch (error) {
    return send(
      {
        allowed: false,
        message: error?.message || "Unexpected server error.",
        matchingPlotIds: [],
        focusPlotId: null,
        filters: {
          status: null,
          facing: null,
        },
        actions: [],
      },
      500
    );
  }
};