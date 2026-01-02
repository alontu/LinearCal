import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getYearRangeDates } from "@/lib/date-utils";
import { getEventsForRange, getCalendarList, getEventColors } from "@/lib/google-calendar";
import LinearCalendar from "@/components/LinearCalendar";
import styles from "@/components/LinearCalendar.module.css";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import Link from "next/link";
import { redirect } from "next/navigation";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, eachDayOfInterval, parse, endOfMonth, isValid } from 'date-fns';

interface PageProps {
  searchParams: Promise<{ year?: string; calendars?: string; start?: string; end?: string }>;
}


export default async function Home({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  // Resolve searchParams (Next.js 15+ allows async access to props)
  const awaitedSearchParams = await searchParams;
  const yearParam = awaitedSearchParams?.year;
  const startParam = awaitedSearchParams?.start;
  const endParam = awaitedSearchParams?.end;
  const calendarsParam = awaitedSearchParams?.calendars;

  const currentYear = new Date().getFullYear();
  let startDate: Date;
  let endDate: Date;

  if (startParam && endParam) {
    const s = parse(startParam, 'yyyy-MM', new Date());
    const e = parse(endParam, 'yyyy-MM', new Date());
    if (isValid(s) && isValid(e)) {
      startDate = new Date(s.getFullYear(), s.getMonth(), 1);
      endDate = endOfMonth(e);
    } else {
      // Fallback
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31);
    }
  } else if (yearParam) {
    const y = parseInt(yearParam);
    startDate = new Date(y, 0, 1);
    endDate = new Date(y, 11, 31);
  } else {
    startDate = new Date(currentYear, 0, 1);
    endDate = new Date(currentYear, 11, 31);
  }


  if (!session || !session.accessToken) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.loginLogo}>📅</div>
          <h1 className={styles.loginTitle}>
            לוח שנה ליניארי
            <span style={{ display: 'block', fontSize: '1.4rem', marginTop: '0.5rem', color: '#ffffff', fontWeight: 600 }}>Linear Calendar</span>
          </h1>
          <p className={styles.loginSubtitle}>
            הדרך היעילה ביותר לנהל את הזמן שלך.<br />
            התחבר כדי לצפות ולערוך את יומן Google שלך בתצוגה שנתית.
          </p>
          <p className={styles.loginSubtitle} style={{ direction: 'ltr', marginTop: '1.5rem', fontSize: '1rem', color: '#e0e0e0', lineHeight: 1.6 }}>
            The most efficient way to manage your time.<br />
            Connect your Google Calendar to visualize your year in a continuous linear view.
          </p>
          <GoogleLoginButton />
          <Link href="/terms" className={styles.loginTermsLink}>
            תנאי שימוש ומדיניות פרטיות
          </Link>
        </div>
      </div>
    );
  }

  // Range is already calculated above as startDate / endDate

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
  const events = await getEventsForRange(session.accessToken, startDate, endDate, googleCalendarIds);


  // Fetch event colors definitions (for single-calendar mode)
  const eventColors = await getEventColors(session.accessToken);

  // We pass 'year' to the component to render the grid
  return (
    // We already have container styles in component, but let's just render component
    // Actually, component now includes header and container.
    <LinearCalendar
      events={events}
      startDate={startDate}
      endDate={endDate}
      allCalendars={allCalendars}
      selectedCalendarIds={selectedIds}
      eventColors={eventColors}
    />
  );
}
