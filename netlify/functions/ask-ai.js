// netlify/functions/ask-ai.js
export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ allowed: false, message: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { prompt, context } = await req.json();

    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ allowed: false, message: "Prompt is required." }),
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
      "price",
      "pricing",
      "coordinates",
      "company",
      "luminexa",
      "service",
      "360",
      "virtual tour",
      "drone",
      "dashboard",
    ];

    const lowerPrompt = prompt.toLowerCase();
    const isAllowed = allowedKeywords.some((word) => lowerPrompt.includes(word));

    if (!isAllowed) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message:
            "I can only help with project, plot, map, coordinates, and company-related questions.",
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
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const upstreamRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `
You are a restricted assistant for a real-estate image mapping web application.

You must answer only from:
1. provided company details
2. provided project details
3. provided selected plot details
4. provided plot/map coordinate data

If the question is outside this scope, reply exactly:
"I can only help with project, plot, map, coordinates, and company-related questions."

Return valid JSON only in this format:
{
  "allowed": true,
  "message": "",
  "matchingPlotIds": [],
  "focusPlotId": null,
  "filters": {
    "status": null,
    "facing": null
  }
}

Rules:
- Do not invent plots.
- Use only the provided data.
- If data is unavailable, say so.
- Keep it concise.
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
    });

    const upstreamData = await upstreamRes.json();

    if (!upstreamRes.ok) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message:
            upstreamData?.error?.message ||
            upstreamData?.message ||
            "Failed to connect to NVIDIA API.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const raw = upstreamData?.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        allowed: true,
        message: raw,
        matchingPlotIds: [],
        focusPlotId: null,
        filters: {
          status: null,
          facing: null,
        },
      };
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        allowed: false,
        message: error.message || "Unexpected server error.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};