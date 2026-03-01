import { describe, it, expect } from "vitest";
import { getBookingUrl } from "../booking-url";

describe("getBookingUrl", () => {
  describe("ForeUp", () => {
    it("builds basic ForeUp URL", () => {
      const url = getBookingUrl("foreup", "18747");
      expect(url).toBe(
        "https://foreupsoftware.com/index.php/booking/index/18747#/teetimes"
      );
    });

    it("includes schedule_id when provided", () => {
      const url = getBookingUrl("foreup", "18747", undefined, null, "357");
      expect(url).toBe(
        "https://foreupsoftware.com/index.php/booking/index/18747/357#/teetimes"
      );
    });

    it("ignores date parameter for ForeUp", () => {
      const url = getBookingUrl("foreup", "18747", "2026-03-07");
      expect(url).not.toContain("2026-03-07");
    });
  });

  describe("Chronogolf", () => {
    it("builds Chronogolf URL with booking slug", () => {
      const url = getBookingUrl("chronogolf", "19226", undefined, "black-desert-resort");
      expect(url).toBe("https://www.chronogolf.com/club/black-desert-resort");
    });

    it("includes date when provided", () => {
      const url = getBookingUrl("chronogolf", "19226", "2026-03-07", "black-desert-resort");
      expect(url).toBe(
        "https://www.chronogolf.com/club/black-desert-resort?date=2026-03-07"
      );
    });

    it("returns # when no booking slug", () => {
      const url = getBookingUrl("chronogolf", "19226");
      expect(url).toBe("#");
    });
  });

  describe("unknown platform", () => {
    it("returns # for unknown platform", () => {
      expect(getBookingUrl("golfnow", "123")).toBe("#");
    });
  });
});
