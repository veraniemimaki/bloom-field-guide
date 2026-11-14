import http from "node:http";

const port = Number(process.env.PORT || 10000);
const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || "http://localhost:8000")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
);
const maxBodyBytes = 4096;

function applyCors(req, res) {
  const origin = req.headers.origin;
  res.setHeader("Vary", "Origin");
  if (!origin) return true;
  if (!allowedOrigins.has(origin)) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return true;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > maxBodyBytes) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Send a valid JSON body.");
    error.statusCode = 400;
    throw error;
  }
}

function suggestContext(text) {
  if (/\b(wind down|evening|sleep|bedtime|quiet)\b/i.test(text)) {
    return "wind-down";
  }
  if (/\b(outside|outdoors|fresh air|nature|trees|forest|walk)\b/i.test(text)) {
    return "outside";
  }
  return "reset";
}

const server = http.createServer(async (req, res) => {
  if (!applyCors(req, res)) {
    sendJson(res, 403, { error: "This origin is not allowed." });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { status: "ok", mode: "mock" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/preferences/interpret") {
    if (!req.headers["content-type"]?.toLowerCase().includes("application/json")) {
      sendJson(res, 415, { error: "Content-Type must be application/json." });
      return;
    }

    try {
      const body = await readJson(req);
      const text = typeof body?.text === "string" ? body.text.trim() : "";
      if (!text || text.length > 320) {
        sendJson(res, 400, { error: "Provide a short text value (1–320 characters)." });
        return;
      }

      sendJson(res, 200, {
        mode: "mock",
        suggestedContext: suggestContext(text),
        explanation: "This demo uses simple keyword rules. It is not a mood or clinical assessment."
      });
    } catch (error) {
      sendJson(res, error.statusCode || 400, { error: error.message || "Invalid request." });
    }
    return;
  }

  sendJson(res, 404, { error: "Route not found." });
});

server.listen(port, "0.0.0.0");
