#!/usr/bin/env -S tsx
/**
 * Local Chronogolf relay server.
 *
 * Runs on the Mac mini to bypass Cloudflare's TLS fingerprinting.
 * Uses curl subprocess (which has a trusted TLS fingerprint) instead of
 * Node.js fetch (which Cloudflare detects and blocks).
 *
 * Usage:
 *   RELAY_SECRET=your-secret tsx scripts/chronogolf-relay.ts
 *
 * Keep running with pm2:
 *   pm2 start scripts/chronogolf-relay.ts --interpreter tsx --name chronogolf-relay
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

const CHRONOGOLF_BASE = "https://www.chronogolf.com/marketplace/clubs";

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

      const targetUrl = `${CHRONOGOLF_BASE}/${club_id}/teetimes?${params}`;
      const { status, body } = await curlChronogolf(targetUrl);

      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(body);

      console.log(
        `[${new Date().toISOString()}] club=${club_id} date=${date} status=${status} bytes=${body.length}`
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Use /teetimes or /health" }));
  }
);

httpServer.listen(PORT, () => {
  console.log(`Chronogolf relay listening on http://localhost:${PORT}`);
  console.log("Using curl subprocess for Cloudflare-compatible TLS fingerprint");
});
