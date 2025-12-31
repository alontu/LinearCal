import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getYearRangeDates } from "@/lib/date-utils";
import { getEventsForRange, getCalendarList, getEventColors } from "@/lib/google-calendar";
import LinearCalendar from "@/components/LinearCalendar";
import styles from "@/components/LinearCalendar.module.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

interface PageProps {
  searchParams: Promise<{ year?: string; calendars?: string }>;
}


export default async function Home({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  // Resolve searchParams (Next.js 15+ allows async access to props)
  const awaitedSearchParams = await searchParams;
  const yearParam = awaitedSearchParams?.year;
  const calendarsParam = awaitedSearchParams?.calendars;

  const currentYear = new Date().getFullYear();
  const year = yearParam ? parseInt(yearParam) : currentYear;


  if (!session || !session.accessToken) {
    // ... Login UI (omitted for brevity, reuse existing block) ...
    return (
      <div className={styles.loginContainer}>
        <h1 className={styles.title}>לוח שנה ליניארי</h1>
        <p>התחבר ל-Google Calendar כדי להתחיל.</p>
        <Link href="/api/auth/signin" className={styles.loginButton}>
          התחבר ל-Google Calendar
        </Link>
      </div>
    );
  }

  // Generate range for the selected year
  const start = new Date(year, 0, 1); // Jan 1
  const end = new Date(year, 11, 31); // Dec 31

  // Fetch available calendars to show in filter
  const allCalendars = await getCalendarList(session.accessToken);

  // Determine which calendars to fetch
  // If param exists, split by comma. Else, use 'primary' (or all? Usually just primary is default).
  // Let's default to Primary if nothing selected to avoid overwhelming.
  let selectedIds: string[] = [];
  if (calendarsParam) {
    selectedIds = calendarsParam.split(',');
  } else {
    const primary = allCalendars.find(c => c.primary);
    selectedIds = primary && primary.id ? [primary.id] : ['primary'];
  }

  // Fetch events for the WHOLE year from selected calendars
  // Filter out virtual calendars (like Jewish Calendar)
  const googleCalendarIds = selectedIds.filter(id => id !== 'jewish-calendar');
  const events = await getEventsForRange(session.accessToken, start, end, googleCalendarIds);


  // Fetch event colors definitions (for single-calendar mode)
  const eventColors = await getEventColors(session.accessToken);

  // We pass 'year' to the component to render the grid
  return (
    // We already have container styles in component, but let's just render component
    // Actually, component now includes header and container.
    <LinearCalendar
      events={events}
      year={year}
      allCalendars={allCalendars}
      selectedCalendarIds={selectedIds}
      eventColors={eventColors}
    />
  );
}
