import { exec } from "child_process";
import { promisify } from "util";
import type { TeeTime } from "../pollers/types";

const execAsync = promisify(exec);

export async function sendIMessage(
  phoneNumber: string,
  courseName: string,
  times: TeeTime[]
): Promise<void> {
  const timeLines = times
    .slice(0, 5) // Limit to 5 times per message
    .map(
      (t) =>
        `${t.time} - ${t.availableSpots} spots | ${t.holes}h | $${t.greenFee}`
    )
    .join("\n");

  const message = `TEE TIME ALERT\n${courseName}\n${times[0]?.raw?.date || ""}\n\n${timeLines}`;

  const escaped = message.replace(/"/g, '\\"').replace(/\n/g, "\\n");

  const script = `
    tell application "Messages"
      set targetService to 1st account whose service type = iMessage
      set targetBuddy to participant "${phoneNumber}" of targetService
      send "${escaped}" to targetBuddy
    end tell
  `;

  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
}
