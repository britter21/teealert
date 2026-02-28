/**
 * Build a direct booking URL for a course on its native platform.
 */
export function getBookingUrl(
  platform: string,
  platformCourseId: string,
  date?: string
): string {
  switch (platform) {
    case "foreup": {
      const base = `https://foreupsoftware.com/index.php/booking/${platformCourseId}`;
      return date ? `${base}#date=${date}` : base;
    }
    case "chronogolf": {
      const base = `https://www.chronogolf.com/marketplace/clubs/${platformCourseId}`;
      return date ? `${base}#teetimes?date=${date}` : base;
    }
    default:
      return "#";
  }
}
