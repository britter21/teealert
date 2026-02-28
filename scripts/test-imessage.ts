/**
 * E2E test: Call matcher with mock tee times to trigger iMessage notification.
 * Run: npx tsx scripts/test-imessage.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { matchAndNotify } from "../src/lib/matcher";
import type { TeeTime } from "../src/lib/pollers/types";

async function main() {
  const courseId = "9de4c8c8-0f60-423f-873e-613263f8e190";
  const courseName = "Black Desert Resort";
  const targetDate = "2026-03-07";
  const platform = "chronogolf";
  const platformCourseId = "19226";

  // Simulated available tee times (based on real data from availability API)
  const mockTimes: TeeTime[] = [
    {
      time: "15:24",
      holes: 18,
      availableSpots: 4,
      greenFee: 304.45,
      raw: {},
    },
    {
      time: "09:30",
      holes: 18,
      availableSpots: 2,
      greenFee: 304.45,
      raw: {},
    },
  ];

  console.log(`Testing iMessage notification for ${courseName}...`);
  console.log(`Target date: ${targetDate}`);
  console.log(`Mock times: ${mockTimes.length} available`);
  console.log("");

  const results = await matchAndNotify(
    courseId,
    courseName,
    targetDate,
    mockTimes,
    platform,
    platformCourseId
  );

  if (results.length > 0) {
    console.log("iMessage sent! Results:", JSON.stringify(results, null, 2));
  } else {
    console.log(
      "No alerts matched. Check:\n" +
        "  - Alert is_active = true\n" +
        "  - triggered_at is null\n" +
        "  - start_monitoring_date <= today\n" +
        "  - notify_sms = true\n" +
        "  - user_profiles has phone number"
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
