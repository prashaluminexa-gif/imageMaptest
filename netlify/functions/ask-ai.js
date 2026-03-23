// netlify/functions/ask-ai.js
export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          allowed: false,
          message: "Method not allowed",
          actions: [],
          filters: {},
        }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { prompt, context } = await req.json();

    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message: "Prompt is required.",
          actions: [],
          filters: {},
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const allowedKeywords = [
      "plot",
      "plots",
      "project",
      "block",
      "layout",
      "map",
      "image mapping",
      "availability",
      "available",
      "sold",
      "booked",
      "reserved",
      "facing",
      "corner",
      "park",
      "area",
      "sqft",
      "sq ft",
      "price",
      "pricing",
      "cost",
      "rate",
      "coordinates",
      "company",
      "service",
      "launch",
      "location",
      "trees",
      "tree",
      "fruit",
      "forest",
      "coconut",
      "details",
      "comparison",
      "compare",
      "investment",
      "highlight",
      "highlights",
      "amenities",
      "amenity",
      "status",
      "premium",
      "east",
      "west",
      "north",
      "south",
      "unit",
      "units",
      "survey",
      "description",
      "value",
      "real estate",
    ];

    const lowerPrompt = prompt.toLowerCase();
    const isAllowed = allowedKeywords.some((word) => lowerPrompt.includes(word));

    if (!isAllowed) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message:
            "Certainly sir. I can assist only with project, plot, map, pricing, tree details, coordinates, and company-related queries for this application.",
          actions: [],
          filters: {},
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message: "Missing NVIDIA_API_KEY in Netlify environment variables.",
          actions: [],
          filters: {},
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const upstreamRes = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta/llama-3.1-70b-instruct",
          temperature: 0.25,
          top_p: 0.9,
          max_tokens: 1200,
          messages: [
            {
              role: "system",
              content: `
You are a professional real-estate sales executive assistant for a plotted development application.

You must answer ONLY from:
1. provided company details
2. provided project details
3. provided selected plot details
4. provided plots array
5. provided coordinate and map details

You must never invent any project, plot, tree, pricing, or company information.

TONE RULES:
- Sound like a polished sales executive speaking to a customer
- Professional, warm, premium, helpful, persuasive
- Use phrases like "Certainly sir", "Based on the available project details", "This appears to be a strong option"
- Keep response concise but valuable
- Do not sound robotic

BEHAVIOR RULES:
- If the user asks about plot suggestions, mention benefits like facing, area, trees, pricing, status, and project appeal if available
- If the user asks about project details, mention location, launch date, highlights, amenities, availability, description and value if available
- If user asks about trees, mention counts and names wherever available
- If user asks about pricing, mention available price-related values only if present
- If user asks about multiple plots, compare only using the given data
- If data is missing, clearly say it is not available in the current project data

IMPORTANT UI RULES:
- Do NOT ask the UI to auto-open a plot directly
- Instead, when specific plot(s) are relevant, return clickable action buttons
- For plot view button use:
  {
    "type": "view_plot",
    "label": "View Plot 12",
    "plotId": "plot-12"
  }

- For filter buttons use:
  {
    "type": "apply_filter",
    "label": "Show east facing plots",
    "filters": { "facing": "E" }
  }

- For clearing filters use:
  {
    "type": "reset_filters",
    "label": "Clear current filters"
  }

RETURN FORMAT:
You must return valid JSON only in exactly this shape:
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

FIELD RULES:
- "allowed" must be true for in-scope questions
- "message" must be natural sales-executive style text
- "matchingPlotIds" can include matching plot ids if relevant
- "focusPlotId" must always be null
- "filters.status" should be a status string only if clearly requested
- "filters.facing" should be a facing string only if clearly requested
- "actions" should contain clickable actions whenever useful
- If nothing actionable is needed, return empty array for "actions"

SPECIAL FILTER MAPPING:
- east => E
- west => W
- north => N
- south => S
- available => status "Available"
- sold => status "Sold"
- booked => status "Booked"
- reserved => status "Reserved"

If the question is outside scope, reply exactly with:
{
  "allowed": false,
  "message": "Certainly sir. I can assist only with project, plot, map, pricing, tree details, coordinates, and company-related queries for this application.",
  "matchingPlotIds": [],
  "focusPlotId": null,
  "filters": {
    "status": null,
    "facing": null
  },
  "actions": []
}
              `.trim(),
            },
            {
              role: "user",
              content: JSON.stringify({
                prompt,
                context,
              }),
            },
          ],
        }),
      }
    );

    const upstreamData = await upstreamRes.json();

    if (!upstreamRes.ok) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message:
            upstreamData?.error?.message ||
            upstreamData?.message ||
            "Failed to connect to NVIDIA API.",
          actions: [],
          filters: {},
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const raw = upstreamData?.choices?.[0]?.message?.content || "{}";

    const safeFallback = {
      allowed: true,
      message:
        "Certainly sir. Based on the available project data, I’m ready to assist with plot availability, pricing, facing, tree details, and project highlights.",
      matchingPlotIds: [],
      focusPlotId: null,
      filters: {
        status: null,
        facing: null,
      },
      actions: [],
    };

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      const cleanedRaw = String(raw)
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/i, "")
        .trim();

      try {
        parsed = JSON.parse(cleanedRaw);
      } catch {
        parsed = {
          ...safeFallback,
          message: cleanedRaw || safeFallback.message,
        };
      }
    }

    const normalized = {
      allowed:
        typeof parsed?.allowed === "boolean" ? parsed.allowed : safeFallback.allowed,

      message:
        typeof parsed?.message === "string" && parsed.message.trim()
          ? parsed.message.trim()
          : safeFallback.message,

      matchingPlotIds: Array.isArray(parsed?.matchingPlotIds)
        ? parsed.matchingPlotIds.filter(Boolean)
        : [],

      focusPlotId: null,

      filters: {
        status:
          typeof parsed?.filters?.status === "string" && parsed.filters.status.trim()
            ? parsed.filters.status.trim()
            : null,
        facing:
          typeof parsed?.filters?.facing === "string" && parsed.filters.facing.trim()
            ? parsed.filters.facing.trim()
            : null,
      },

      actions: Array.isArray(parsed?.actions)
        ? parsed.actions
            .map((action) => {
              if (!action || typeof action !== "object") return null;

              if (action.type === "view_plot") {
                return {
                  type: "view_plot",
                  label:
                    typeof action.label === "string" && action.label.trim()
                      ? action.label.trim()
                      : "View Plot",
                  plotId:
                    typeof action.plotId === "string" ? action.plotId : null,
                };
              }

              if (action.type === "apply_filter") {
                return {
                  type: "apply_filter",
                  label:
                    typeof action.label === "string" && action.label.trim()
                      ? action.label.trim()
                      : "Apply Filter",
                  filters:
                    action.filters && typeof action.filters === "object"
                      ? {
                          status:
                            typeof action.filters.status === "string"
                              ? action.filters.status
                              : null,
                          facing:
                            typeof action.filters.facing === "string"
                              ? action.filters.facing
                              : null,
                        }
                      : {},
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

              if (action.type === "link") {
                return {
                  type: "link",
                  label:
                    typeof action.label === "string" && action.label.trim()
                      ? action.label.trim()
                      : "Open Link",
                  url: typeof action.url === "string" ? action.url : "",
                };
              }

              return null;
            })
            .filter(Boolean)
        : [],
    };

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        allowed: false,
        message: error.message || "Unexpected server error.",
        matchingPlotIds: [],
        focusPlotId: null,
        filters: {
          status: null,
          facing: null,
        },
        actions: [],
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};