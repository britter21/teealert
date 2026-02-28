import { exec } from "child_process";
import { promisify } from "util";
import type { TeeTime } from "../pollers/types";

const execAsync = promisify(exec);

const RELAY_URL = process.env.CHRONOGOLF_RELAY_URL;
const RELAY_SECRET = process.env.CHRONOGOLF_RELAY_SECRET;

function formatMessage(
  courseName: string,
  times: TeeTime[],
  bookingUrl?: string
): string {
  const timeLines = times
    .slice(0, 5)
    .map(
      (t) =>
        `${t.time} - ${t.availableSpots < 0 ? "open" : `${t.availableSpots} spots`} | ${t.holes}h | $${t.greenFee}`
    )
    .join("\n");

  const parts = ["TEE TIME ALERT", courseName, "", timeLines];
  if (bookingUrl) {
    parts.push("", `Book now: ${bookingUrl}`);
  }
  return parts.join("\n");
}

/**
 * Send an iMessage.
 *
 * If CHRONOGOLF_RELAY_URL is set, POSTs to the relay server on the Mac mini.
 * Otherwise falls back to local osascript (only works on macOS).
 */
export async function sendIMessage(
  phoneNumber: string,
  courseName: string,
  times: TeeTime[],
  bookingUrl?: string
): Promise<void> {
  const message = formatMessage(courseName, times, bookingUrl);

  // Production: send via relay server on Mac mini
  if (RELAY_URL && RELAY_SECRET) {
    const res = await fetch(`${RELAY_URL}/imessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Relay-Secret": RELAY_SECRET,
      },
      body: JSON.stringify({ phone: phoneNumber, message }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`iMessage relay failed (${res.status}): ${body}`);
    }
    return;
  }

  // Local dev: send via osascript directly
  const escaped = message
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");

  const script = `tell application "Messages"
  set targetService to 1st account whose service type = iMessage
  set targetBuddy to participant "${phoneNumber}" of targetService
  send "${escaped}" to targetBuddy
end tell`;

  try {
    await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      timeout: 10000,
    });
  } catch (err) {
    console.error("iMessage send failed:", err);
    throw new Error(`iMessage failed: ${(err as Error).message}`);
  }
}
