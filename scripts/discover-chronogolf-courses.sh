#!/bin/bash
# Discover Chronogolf course data by scraping club pages.
#
# Usage:
#   ./scripts/discover-chronogolf-courses.sh <club_slug> [club_slug...]
#   ./scripts/discover-chronogolf-courses.sh black-desert-resort sand-hollow-resort coral-canyon-golf-course
#
# Club slugs come from the Chronogolf URL: chronogolf.com/club/<slug>
# Outputs SQL INSERT statements for each discovered course.

set -euo pipefail

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
BASE="https://www.chronogolf.com/club"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <club_slug> [club_slug...]" >&2
  echo "" >&2
  echo "Example: $0 black-desert-resort sand-hollow-resort" >&2
  echo "" >&2
  echo "Club slugs come from: chronogolf.com/club/<slug>" >&2
  echo "Scrapes the club page for IDs, courses, and booking config." >&2
  exit 1
fi

echo "-- Chronogolf course discovery — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

for SLUG in "$@"; do
  echo "-- ===== Club: $SLUG ====="

  HTML=$(curl -s -L "$BASE/$SLUG" \
    -H "User-Agent: $UA" \
    -H "Accept: text/html" 2>&1)

  # Extract __NEXT_DATA__ JSON
  NEXT_DATA=$(echo "$HTML" | python3 -c "
import sys, re, json

html = sys.stdin.read()
match = re.search(r'<script id=\"__NEXT_DATA__\" type=\"application/json\">(.*?)</script>', html)
if not match:
    print('ERROR: No __NEXT_DATA__ found')
    sys.exit(1)

data = json.loads(match.group(1))
props = data.get('props', {}).get('pageProps', {})

club = props.get('club', {})
club_id = club.get('id')
club_name = club.get('name', 'Unknown')
club_city = club.get('city', '')
club_province = club.get('province', '')  # 'state' field is record status, province is the actual state/province
timezone = club.get('timezone', 'America/Denver')
online_booking = club.get('onlineBookingEnabled', False)

# Get affiliation type — prefer club-level default, fall back to pageProps list
default_aff_id = club.get('defaultAffiliationTypeId', None)
aff_types = props.get('affiliationTypes', [])
if not default_aff_id and aff_types:
    default_aff_id = aff_types[0].get('id')
default_aff_name = next((a.get('name', 'Unknown') for a in aff_types if a.get('id') == default_aff_id), 'Default')

# Booking config
booking_config = props.get('bookingConfiguration', {})
public_range = booking_config.get('defaultPublicBookingRange', 14)

# Get courses
courses = club.get('courses', [])
if not courses:
    courses = [{'id': 'UNKNOWN', 'name': club_name}]

print(f'-- Club: {club_name} (ID: {club_id})')
print(f'-- Location: {club_city}, {club_province}')
print(f'-- Timezone: {timezone}')
print(f'-- Online booking: {online_booking}')
print(f'-- Booking window: {public_range} days')
print(f'-- Default affiliation type: {default_aff_id} ({default_aff_name})')
print(f'-- All affiliation types: {[(a.get(\"id\"), a.get(\"name\")) for a in aff_types]}')
print(f'-- Courses: {[(c.get(\"id\"), c.get(\"name\")) for c in courses]}')
print()

for course in courses:
    course_id = course.get('id', 'UNKNOWN')
    course_name = course.get('name', club_name)
    is_active = 'true' if online_booking else 'false'

    print(f\"\"\"INSERT INTO courses (name, platform, platform_course_id, platform_schedule_id, platform_booking_class, location_city, location_state, timezone, booking_window_days, poll_interval_seconds, is_active)
VALUES (
  '{course_name.replace(chr(39), chr(39)+chr(39))}',
  'chronogolf',
  '{club_id}',          -- club_id
  '{course_id}',        -- course_id
  '{default_aff_id or \"NULL\"}',   -- affiliation_type_id ({default_aff_name})
  '{club_city.replace(chr(39), chr(39)+chr(39))}',
  '{club_province}',
  '{timezone}',
  {public_range},
  60,
  {is_active}           -- online_booking={online_booking}
)
ON CONFLICT (platform, platform_course_id) DO NOTHING;
\"\"\")
" 2>&1)

  echo "$NEXT_DATA"
  echo ""

  # Be polite — small delay between requests
  sleep 1
done
