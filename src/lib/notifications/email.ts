import { Resend } from "resend";
import type { TeeTime } from "../pollers/types";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "alerts@teetimehawk.com";
const FROM_NAME = "Tee Time Hawk";

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

function buildHtml(
  courseName: string,
  times: TeeTime[],
  bookingUrl?: string,
  targetDate?: string
): string {
  const top5 = times.slice(0, 5);

  const timeRows = top5
    .map(
      (t) => `
      <tr>
        <td style="padding:8px 12px;font-size:15px;color:#e4f0e0;border-bottom:1px solid #1e2b23;">
          ${formatTime12h(t.time)}
        </td>
        <td style="padding:8px 12px;font-size:15px;color:#a4b89e;border-bottom:1px solid #1e2b23;">
          ${t.availableSpots < 0 ? "Open" : `${t.availableSpots} spot${t.availableSpots !== 1 ? "s" : ""}`}
        </td>
        <td style="padding:8px 12px;font-size:15px;color:#a4b89e;border-bottom:1px solid #1e2b23;">
          ${t.holes}h
        </td>
        <td style="padding:8px 12px;font-size:15px;color:#a4b89e;border-bottom:1px solid #1e2b23;">
          $${t.greenFee}
        </td>
      </tr>`
    )
    .join("");

  const extra = times.length > 5 ? `<p style="color:#6b7d68;font-size:13px;margin:8px 0 0;">+${times.length - 5} more available</p>` : "";

  const ctaBlock = bookingUrl
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${bookingUrl}" style="display:inline-block;background:#4a9e6a;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
          Book Now
        </a>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d1610;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:24px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:13px;font-weight:600;letter-spacing:2px;color:#4a9e6a;text-transform:uppercase;">Tee Time Alert</span>
    </div>
    <div style="background:#151f19;border-radius:12px;padding:24px;border:1px solid #1e2b23;">
      <h2 style="margin:0 0 4px;font-size:20px;color:#e4f0e0;">${courseName}</h2>
      ${targetDate ? `<p style="margin:0 0 16px;font-size:14px;color:#6b7d68;">${formatDate(targetDate)} &middot; ${times.length} tee time${times.length !== 1 ? "s" : ""} found</p>` : ""}
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:6px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7d68;text-align:left;border-bottom:1px solid #1e2b23;">Time</th>
            <th style="padding:6px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7d68;text-align:left;border-bottom:1px solid #1e2b23;">Spots</th>
            <th style="padding:6px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7d68;text-align:left;border-bottom:1px solid #1e2b23;">Holes</th>
            <th style="padding:6px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7d68;text-align:left;border-bottom:1px solid #1e2b23;">Fee</th>
          </tr>
        </thead>
        <tbody>
          ${timeRows}
        </tbody>
      </table>
      ${extra}
      ${ctaBlock}
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="font-size:12px;color:#6b7d68;margin:0;">
        Sent by <a href="https://teetimehawk.com" style="color:#4a9e6a;text-decoration:none;">Tee Time Hawk</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildText(
  courseName: string,
  times: TeeTime[],
  bookingUrl?: string,
  targetDate?: string
): string {
  const dateLine = targetDate ? ` — ${formatDate(targetDate)}` : "";
  const lines = ["TEE TIME ALERT", `${courseName}${dateLine}`, `${times.length} tee time${times.length !== 1 ? "s" : ""} found`, ""];
  for (const t of times.slice(0, 5)) {
    const spots = t.availableSpots < 0 ? "open" : `${t.availableSpots} spots`;
    lines.push(`${formatTime12h(t.time)} - ${spots} | ${t.holes}h | $${t.greenFee}`);
  }
  if (times.length > 5) lines.push(`+${times.length - 5} more available`);
  if (bookingUrl) {
    lines.push("", `Book now: ${bookingUrl}`);
  }
  return lines.join("\n");
}

export async function sendAlertEmail(
  to: string,
  courseName: string,
  times: TeeTime[],
  bookingUrl?: string,
  targetDate?: string
): Promise<{ id: string }> {
  const datePart = targetDate ? ` on ${formatDate(targetDate)}` : "";
  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject: `${times.length} tee time${times.length !== 1 ? "s" : ""} at ${courseName}${datePart}`,
    html: buildHtml(courseName, times, bookingUrl, targetDate),
    text: buildText(courseName, times, bookingUrl, targetDate),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return { id: data!.id };
}
