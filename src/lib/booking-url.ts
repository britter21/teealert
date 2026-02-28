/**
 * Build a direct booking URL for a course on its native platform.
 */
export function getBookingUrl(
  platform: string,
  platformCourseId: string,
  date?: string,
  bookingSlug?: string | null
): string {
  switch (platform) {
    case "foreup": {
      const base = `https://foreupsoftware.com/index.php/booking/${platformCourseId}`;
      return date ? `${base}#date=${date}` : base;
    }
    case "chronogolf": {
      if (bookingSlug) {
        const base = `https://www.chronogolf.com/club/${bookingSlug}`;
        return date ? `${base}?date=${date}` : base;
      }
      return "#";
    }
    default:
      return "#";
  }
}
