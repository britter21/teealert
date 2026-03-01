import { exec } from "child_process";
import { promisify } from "util";
import type { TeeTime } from "../pollers/types";

const execAsync = promisify(exec);

const RELAY_URL = process.env.CHRONOGOLF_RELAY_URL;
const RELAY_SECRET = process.env.CHRONOGOLF_RELAY_SECRET;

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${m} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${months[month - 1]} ${day}`;
}

function formatMessage(
  courseName: string,
  times: TeeTime[],
  bookingUrl?: string,
  targetDate?: string
): string {
  const dateLine = targetDate ? `${formatDate(targetDate)} · ` : "";
  const timeLines = times
    .slice(0, 5)
    .map((t) => {
      const spots = t.availableSpots < 0 ? "open" : `${t.availableSpots} spot${t.availableSpots !== 1 ? "s" : ""}`;
      return `${formatTime12h(t.time)} · ${spots} · ${t.holes}h · $${t.greenFee}`;
    })
    .join("\n");

  const parts = [
    `TEE TIME ALERT`,
    `${courseName}`,
    `${dateLine}${times.length} tee time${times.length !== 1 ? "s" : ""} found`,
    "",
    timeLines,
  ];
  if (times.length > 5) parts.push(`+${times.length - 5} more`);
  if (bookingUrl) parts.push("", `Book now: ${bookingUrl}`);
  return parts.join("\n");
}

/**
 * Deliver a message string via relay (production) or osascript (local dev).
 */
async function deliver(phoneNumber: string, message: string): Promise<void> {
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

/**
 * Send a tee time alert iMessage.
 */
export async function sendIMessage(
  phoneNumber: string,
  courseName: string,
  times: TeeTime[],
  bookingUrl?: string,
  targetDate?: string
): Promise<void> {
  const message = formatMessage(courseName, times, bookingUrl, targetDate);
  await deliver(phoneNumber, message);
}

/**
 * Send a plain text iMessage (e.g. confirmation messages).
 */
export async function sendPlainIMessage(
  phoneNumber: string,
  message: string
): Promise<void> {
  await deliver(phoneNumber, message);
}
