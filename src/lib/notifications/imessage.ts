import { exec } from "child_process";
import { promisify } from "util";
import type { TeeTime } from "../pollers/types";

const execAsync = promisify(exec);

/**
 * Send an iMessage via osascript (only works on macOS with Messages app logged in).
 * For Vercel deployment, this would need a local relay server on the Mac mini.
 */
export async function sendIMessage(
  phoneNumber: string,
  courseName: string,
  times: TeeTime[]
): Promise<void> {
  const timeLines = times
    .slice(0, 5)
    .map(
      (t) =>
        `${t.time} - ${t.availableSpots} spots | ${t.holes}h | $${t.greenFee}`
    )
    .join("\n");

  const message = [
    "TEE TIME ALERT",
    courseName,
    "",
    timeLines,
  ].join("\n");

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
