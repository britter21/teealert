/**
 * Build a direct booking URL for a course on its native platform.
 */
export function getBookingUrl(
  platform: string,
  platformCourseId: string,
  date?: string,
  bookingSlug?: string | null,
  platformScheduleId?: string | null
): string {
  switch (platform) {
    case "foreup": {
      const base = platformScheduleId
        ? `https://foreupsoftware.com/index.php/booking/index/${platformCourseId}/${platformScheduleId}`
        : `https://foreupsoftware.com/index.php/booking/index/${platformCourseId}`;
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
