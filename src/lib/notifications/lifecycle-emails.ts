import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Tee Time Hawk <hello@teetimehawk.com>";
const BASE_URL = "https://teetimehawk.com";

function wrap(heading: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d1610;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:24px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:13px;font-weight:600;letter-spacing:2px;color:#4a9e6a;text-transform:uppercase;">Tee Time Hawk</span>
    </div>
    <div style="background:#151f19;border-radius:12px;padding:24px;border:1px solid #1e2b23;">
      <h2 style="margin:0 0 16px;font-size:20px;color:#e4f0e0;">${heading}</h2>
      ${body}
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="font-size:12px;color:#6b7d68;margin:0;">
        <a href="${BASE_URL}" style="color:#4a9e6a;text-decoration:none;">Tee Time Hawk</a>
        &nbsp;&middot;&nbsp;
        <a href="${BASE_URL}/settings" style="color:#6b7d68;text-decoration:none;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function cta(text: string, href: string): string {
  return `<div style="text-align:center;margin:24px 0 8px;">
    <a href="${href}" style="display:inline-block;background:#4a9e6a;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">${text}</a>
  </div>`;
}

function p(text: string): string {
  return `<p style="color:#a4b89e;font-size:15px;line-height:1.6;margin:0 0 12px;">${text}</p>`;
}

// ─── Welcome email ───────────────────────────────────────────────

export async function sendWelcomeEmail(to: string): Promise<void> {
  const body = [
    p("Welcome! Tee Time Hawk monitors golf course booking systems and alerts you the moment a tee time opens up."),
    p("Here's how it works:"),
    `<ul style="color:#a4b89e;font-size:15px;line-height:1.8;margin:0 0 12px;padding-left:20px;">
      <li>Browse courses and create an alert with your preferences</li>
      <li>We check for new tee times every 15–60 seconds</li>
      <li>You get notified instantly via email, push, or iMessage</li>
    </ul>`,
    cta("Browse Courses", `${BASE_URL}/courses`),
  ].join("");

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to Tee Time Hawk",
    html: wrap("Welcome to Tee Time Hawk", body),
    text: `Welcome to Tee Time Hawk!\n\nWe monitor golf course booking systems and alert you the moment a tee time opens up.\n\n1. Browse courses and create an alert\n2. We check every 15-60 seconds\n3. You get notified instantly\n\nBrowse courses: ${BASE_URL}/courses`,
  });
}

// ─── Trial reminder (3 days left) ────────────────────────────────

export async function sendTrialReminderEmail(to: string): Promise<void> {
  const body = [
    p("Your free trial ends in 3 days. After that, your account will switch to the Starter plan."),
    p("With <strong style='color:#e4f0e0;'>Unlimited</strong>, you keep:"),
    `<ul style="color:#a4b89e;font-size:15px;line-height:1.8;margin:0 0 12px;padding-left:20px;">
      <li>Unlimited alerts (Starter limits you to 2)</li>
      <li>15-second polling (Starter: 60 seconds)</li>
      <li>All notification channels</li>
    </ul>`,
    cta("Upgrade Now", `${BASE_URL}/pricing`),
  ].join("");

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your trial ends in 3 days",
    html: wrap("Your trial ends in 3 days", body),
    text: `Your free trial ends in 3 days.\n\nAfter that, your account switches to Starter (2 alerts max, 60s polling).\n\nUpgrade to Unlimited to keep unlimited alerts and 15s polling.\n\nUpgrade: ${BASE_URL}/pricing`,
  });
}

// ─── Trial expired ───────────────────────────────────────────────

export async function sendTrialExpiredEmail(to: string): Promise<void> {
  const body = [
    p("Your free trial has ended. Your account is now on the Starter plan."),
    `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr>
          <th style="padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7d68;text-align:left;border-bottom:1px solid #1e2b23;"></th>
          <th style="padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7d68;text-align:left;border-bottom:1px solid #1e2b23;">Starter</th>
          <th style="padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#4a9e6a;text-align:left;border-bottom:1px solid #1e2b23;">Unlimited</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 12px;font-size:14px;color:#a4b89e;border-bottom:1px solid #1e2b23;">Alerts</td>
          <td style="padding:8px 12px;font-size:14px;color:#a4b89e;border-bottom:1px solid #1e2b23;">2</td>
          <td style="padding:8px 12px;font-size:14px;color:#e4f0e0;border-bottom:1px solid #1e2b23;">Unlimited</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-size:14px;color:#a4b89e;border-bottom:1px solid #1e2b23;">Polling</td>
          <td style="padding:8px 12px;font-size:14px;color:#a4b89e;border-bottom:1px solid #1e2b23;">60s</td>
          <td style="padding:8px 12px;font-size:14px;color:#e4f0e0;border-bottom:1px solid #1e2b23;">15s</td>
        </tr>
      </tbody>
    </table>`,
    cta("Upgrade to Unlimited", `${BASE_URL}/pricing`),
  ].join("");

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your free trial has ended",
    html: wrap("Your free trial has ended", body),
    text: `Your free trial has ended. Your account is now on the Starter plan (2 alerts, 60s polling).\n\nUpgrade to Unlimited for unlimited alerts and 15s polling.\n\nUpgrade: ${BASE_URL}/pricing`,
  });
}
