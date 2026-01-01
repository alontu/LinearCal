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
        <div className={styles.loginCard}>
          <div className={styles.loginLogo}>📅</div>
          <h1 className={styles.loginTitle}>Linear Calendar</h1>
          <p className={styles.loginSubtitle}>
            הדרך היעילה ביותר לנהל את הזמן שלך.<br />
            התחבר כדי לצפות ולערוך את יומן Google שלך בתצוגה שנתית.
          </p>
          <Link href="/api/auth/signin" className={styles.loginButton}>
            {/* Google Icon SVG */}
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            התחבר עם Google
          </Link>
        </div>
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
  const googleCalendarIds = selectedIds.filter(id => id !== 'jewish-calendar' && id !== 'hebrew-date');
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
