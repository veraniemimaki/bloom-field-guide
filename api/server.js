import http from "node:http";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const port = Number(process.env.PORT || 10000);
const allowedOrigins = new Set([
  "https://bloom-field-guide.onrender.com",
  "https://bloomhuyaah.netlify.app",
  ...(process.env.CORS_ORIGIN || "http://localhost:8000")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
]);
const maxBodyBytes = 4096;
let pool = null;
let databaseReady = false;

function createAivenPool() {
  const connectionString = process.env.AIVEN_DATABASE_URL;
  const caCertificate = process.env.AIVEN_CA_CERT;
  if (!connectionString || !caCertificate) return null;

  try {
    const url = new URL(connectionString);
    // Pass TLS verification through node-postgres, using Aiven's project CA.
    for (const parameter of ["sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"]) {
      url.searchParams.delete(parameter);
    }
    return new Pool({
      connectionString: url.toString(),
      ssl: { ca: caCertificate, rejectUnauthorized: true },
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000
    });
  } catch {
    console.error("Aiven Postgres configuration is invalid.");
    return null;
  }
}

pool = createAivenPool();

function applyCors(req, res) {
  const origin = req.headers.origin;
  res.setHeader("Vary", "Origin");
  if (!origin) return true;
  if (!allowedOrigins.has(origin)) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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
  if (/\b(wind down|evening|sleep|bedtime|quiet)\b/i.test(text)) return "wind-down";
  if (/\b(outside|outdoors|fresh air|nature|trees|forest|walk)\b/i.test(text)) return "outside";
  return "reset";
}

function databaseUnavailable(res) {
  sendJson(res, 503, { error: "The Aiven community database is not configured or available." });
}

function moderatorAuthorized(req) {
  const expected = process.env.COMMUNITY_MODERATOR_TOKEN;
  const supplied = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!expected || !supplied) return false;
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

function moderatorUnavailable(res) {
  sendJson(res, 503, { error: "Protected human review is not configured." });
}

async function initializeDatabase() {
  if (!pool) return;
  try {
    const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
    await pool.query(schema);
    await pool.query("DELETE FROM community_posts WHERE expires_at < NOW()");
    databaseReady = true;
  } catch (error) {
    // Log only the driver error class and code; never emit connection details or certificate contents.
    console.error("Aiven Postgres initialization failed; community routes remain disabled.", {
      name: error?.name || "Error",
      code: error?.code || error?.cause?.code || "unknown"
    });
    await pool.end().catch(() => {});
    pool = null;
  }
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
    sendJson(res, 200, {
      status: "ok",
      mode: databaseReady ? "aiven-postgres" : "mock",
      aivenConfigured: Boolean(process.env.AIVEN_DATABASE_URL && process.env.AIVEN_CA_CERT),
      communityReady: databaseReady && Boolean(process.env.COMMUNITY_MODERATOR_TOKEN),
    });
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

  if (req.method === "GET" && url.pathname === "/api/community/posts") {
    if (!databaseReady) return databaseUnavailable(res);
    try {
      const result = await pool.query(
        "SELECT id, author_alias AS author, body AS text, submitted_at AS \"submittedAt\" FROM community_posts WHERE status = 'approved' AND expires_at > NOW() ORDER BY submitted_at DESC LIMIT 100"
      );
      sendJson(res, 200, { posts: result.rows });
    } catch {
      sendJson(res, 503, { error: "Community posts are temporarily unavailable." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/community/posts") {
    if (!databaseReady) return databaseUnavailable(res);
    if (!process.env.COMMUNITY_MODERATOR_TOKEN) return moderatorUnavailable(res);
    if (!req.headers["content-type"]?.toLowerCase().includes("application/json")) {
      sendJson(res, 415, { error: "Content-Type must be application/json." });
      return;
    }
    try {
      const body = await readJson(req);
      const text = typeof body?.text === "string" ? body.text.trim() : "";
      if (!text || text.length > 280) {
        sendJson(res, 400, { error: "Write a short peer note (1–280 characters)." });
        return;
      }
      const alias = `Member ${randomInt(10, 100)}`;
      const result = await pool.query(
        "INSERT INTO community_posts (author_alias, body, status, flag_reason) VALUES ($1, $2, 'pending_review', 'AI moderation is not connected; held for human review') RETURNING id, status, submitted_at AS \"submittedAt\"",
        [alias, text]
      );
      sendJson(res, 202, { post: { ...result.rows[0], author: alias }, message: "Held from the public room until moderation is configured and a human reviewer approves it." });
    } catch (error) {
      if (error.statusCode) sendJson(res, error.statusCode, { error: error.message });
      else sendJson(res, 503, { error: "The message could not be queued." });
    }
    return;
  }

  if (url.pathname === "/api/community/review-queue" && req.method === "GET") {
    if (!databaseReady) return databaseUnavailable(res);
    if (!moderatorAuthorized(req)) return moderatorUnavailable(res);
    try {
      const result = await pool.query(
        "SELECT id, author_alias AS author, body AS text, flag_reason AS \"flagReason\", submitted_at AS \"submittedAt\" FROM community_posts WHERE status = 'pending_review' AND expires_at > NOW() ORDER BY submitted_at ASC LIMIT 100"
      );
      sendJson(res, 200, { posts: result.rows });
    } catch {
      sendJson(res, 503, { error: "The review queue is temporarily unavailable." });
    }
    return;
  }

  const reviewMatch = url.pathname.match(/^\/api\/community\/posts\/(\d+)\/decision$/);
  if (reviewMatch && req.method === "POST") {
    if (!databaseReady) return databaseUnavailable(res);
    if (!moderatorAuthorized(req)) return moderatorUnavailable(res);
    if (!req.headers["content-type"]?.toLowerCase().includes("application/json")) {
      sendJson(res, 415, { error: "Content-Type must be application/json." });
      return;
    }
    try {
      const body = await readJson(req);
      const decision = body?.decision;
      const note = typeof body?.note === "string" ? body.note.trim() : null;
      if (!["approved", "rejected"].includes(decision) || (note && note.length > 280)) {
        sendJson(res, 400, { error: "Choose approved or rejected and keep any note under 280 characters." });
        return;
      }
      const result = await pool.query(
        "UPDATE community_posts SET status = $1, review_decision = $1, reviewer_note = $2, reviewed_at = NOW() WHERE id = $3 AND status = 'pending_review' RETURNING id, status, reviewed_at AS \"reviewedAt\"",
        [decision, note || null, reviewMatch[1]]
      );
      if (!result.rowCount) {
        sendJson(res, 404, { error: "No pending post was found with that id." });
        return;
      }
      sendJson(res, 200, { post: result.rows[0] });
    } catch (error) {
      if (error.statusCode) sendJson(res, error.statusCode, { error: error.message });
      else sendJson(res, 503, { error: "The review decision could not be saved." });
    }
    return;
  }

  sendJson(res, 404, { error: "Route not found." });
});

async function start() {
  await initializeDatabase();
  server.listen(port, "0.0.0.0");
}

start();
