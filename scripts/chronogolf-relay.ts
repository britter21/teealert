#!/usr/bin/env -S tsx
/**
 * Local relay server for TeeAlert.
 *
 * Runs on the Mac mini. Handles:
 *   1. Chronogolf API proxying (curl-based TLS fingerprint bypass)
 *   2. iMessage sending via osascript (Messages.app must be logged in)
 *
 * Usage:
 *   RELAY_SECRET=your-secret tsx scripts/chronogolf-relay.ts
 *
 * Keep running with pm2:
 *   pm2 start scripts/chronogolf-relay.ts --interpreter tsx --name relay
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const PORT = Number(process.env.PORT) || 3456;
const RELAY_SECRET = process.env.RELAY_SECRET;

if (!RELAY_SECRET) {
  console.error("RELAY_SECRET env var is required");
  process.exit(1);
}

const CHRONOGOLF_V1_BASE = "https://www.chronogolf.com/marketplace/clubs";
const CHRONOGOLF_V2_BASE = "https://www.chronogolf.com/marketplace/v2/teetimes";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

async function sendIMessageLocal(phone: string, message: string): Promise<void> {
  const escaped = message
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");

  const script = `tell application "Messages"
  set targetService to 1st account whose service type = iMessage
  set targetBuddy to participant "${phone}" of targetService
  send "${escaped}" to targetBuddy
end tell`;

  await execFileAsync("osascript", ["-e", script], { timeout: 10000 });
}

function parseQuery(url: string): Record<string, string> {
  const q: Record<string, string> = {};
  const idx = url.indexOf("?");
  if (idx === -1) return q;
  for (const pair of url.slice(idx + 1).split("&")) {
    const [k, v] = pair.split("=");
    if (k) q[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return q;
}

async function curlChronogolf(url: string): Promise<{ status: number; body: string }> {
  try {
    const { stdout } = await execFileAsync("curl", [
      "-s",
      "-w", "\n__HTTP_CODE__%{http_code}",
      url,
      "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "-H", "Accept: application/json, text/plain, */*",
      "-H", "Accept-Language: en-US,en;q=0.9",
      "-H", "Referer: https://www.chronogolf.com/",
      "-H", "Origin: https://www.chronogolf.com",
      "--max-time", "15",
    ]);

    const codeMatch = stdout.match(/__HTTP_CODE__(\d+)$/);
    const status = codeMatch ? Number(codeMatch[1]) : 502;
    const body = stdout.replace(/\n__HTTP_CODE__\d+$/, "");
    return { status, body };
  } catch (err) {
    return { status: 502, body: JSON.stringify({ error: (err as Error).message }) };
  }
}

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    const auth =
      req.headers["x-relay-secret"] ||
      req.headers.authorization?.replace("Bearer ", "");
    if (auth !== RELAY_SECRET) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (req.url?.startsWith("/health")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
      return;
    }

    if (req.url?.startsWith("/teetimes")) {
      const q = parseQuery(req.url);

      // v2 API: uses course UUIDs instead of club numeric IDs
      if (q.version === "v2") {
        const { start_date, course_ids, holes, page } = q;

        if (!start_date || !course_ids) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "start_date and course_ids required for v2" }));
          return;
        }

        const params = new URLSearchParams({
          start_date,
          course_ids,
          holes: holes || "9,18",
          page: page || "1",
        });

        const targetUrl = `${CHRONOGOLF_V2_BASE}?${params}`;
        const { status, body } = await curlChronogolf(targetUrl);

        res.writeHead(status, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(body);

        console.log(
          `[${new Date().toISOString()}] v2 course=${course_ids.slice(0, 8)} date=${start_date} status=${status} bytes=${body.length}`
        );
        return;
      }

      // v1 API: uses club numeric IDs
      const { club_id, date, holes, affiliation_type_ids } = q;

      if (!club_id || !date) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "club_id and date required" }));
        return;
      }

      const params = new URLSearchParams({ date, holes: holes || "18" });
      if (affiliation_type_ids) {
        params.set("affiliation_type_ids", affiliation_type_ids);
      }

      const targetUrl = `${CHRONOGOLF_V1_BASE}/${club_id}/teetimes?${params}`;
      const { status, body } = await curlChronogolf(targetUrl);

      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(body);

      console.log(
        `[${new Date().toISOString()}] v1 club=${club_id} date=${date} status=${status} bytes=${body.length}`
      );
      return;
    }

    // iMessage sending endpoint
    if (req.url?.startsWith("/imessage") && req.method === "POST") {
      try {
        const body = JSON.parse(await readBody(req));
        const { phone, message } = body;

        if (!phone || !message) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "phone and message required" }));
          return;
        }

        await sendIMessageLocal(phone, message);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));

        console.log(
          `[${new Date().toISOString()}] imessage to=${phone.slice(0, 4)}...${phone.slice(-4)} len=${message.length} status=sent`
        );
      } catch (err) {
        const errMsg = (err as Error).message;
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: errMsg }));

        console.error(
          `[${new Date().toISOString()}] imessage FAILED: ${errMsg}`
        );
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Use /teetimes, /imessage, or /health" }));
  }
);

httpServer.listen(PORT, () => {
  console.log(`TeeAlert relay listening on http://localhost:${PORT}`);
  console.log("Endpoints: /teetimes (Chronogolf proxy), /imessage (iMessage sender), /health");
});
