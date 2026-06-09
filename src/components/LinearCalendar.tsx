'use client';

import React, { useState, useEffect } from 'react';
import styles from './LinearCalendar.module.css';
import { CalendarEvent } from '@/lib/google-calendar';
import { format, eachDayOfInterval, isSameDay, getWeek, parseISO, endOfMonth, getDay, isToday, differenceInCalendarDays, eachMonthOfInterval } from 'date-fns';
import { he } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

import DayDetailModal from './DayDetailModal';
import CreateEventModal from './CreateEventModal';
import CalendarHeader from './CalendarHeader';
import { CalendarListEntry } from '@/lib/google-calendar';
import { HDate, gematriya, Locale } from '@hebcal/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { fetchCalendarEventsAction, createCalendarAction } from '@/app/actions';
import { getJewishHolidays, buildHolidayStylingMap } from '@/lib/holidays';
import { buildEventLayout } from '@/lib/event-layout';
import { getContrastColor } from '@/lib/color';
import { JEWISH_CALENDAR_ID, applyCalendarsParam } from '@/lib/calendar-params';

// Virtual Calendar Definition
const JEWISH_CALENDAR: CalendarListEntry = {
    id: JEWISH_CALENDAR_ID,
    summary: 'לוח שנה עברי',
    backgroundColor: '#FFB74D', // Orange-ish
    foregroundColor: '#000000',
    primary: false
};

interface LinearCalendarProps {
    events: CalendarEvent[];
    startDate: Date;
    endDate: Date;
    allCalendars: CalendarListEntry[];
    selectedCalendarIds: string[];
    eventColors: any; // Google Color definitions
}

export default function LinearCalendar({ events: initialEventsProp, startDate, endDate, allCalendars, selectedCalendarIds: initialSelectedIdsProp, eventColors }: LinearCalendarProps) {

    const router = useRouter();
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [showWeeks, setShowWeeks] = useState(true);
    const [showGridlines, setShowGridlines] = useState(true);
    const [showSeparators, setShowSeparators] = useState(true);

    // State for events and visibility
    const [allEvents, setAllEvents] = useState<CalendarEvent[]>(initialEventsProp);
    const [availableCalendars, setAvailableCalendars] = useState<CalendarListEntry[]>(allCalendars);
    const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[]>(initialSelectedIdsProp.filter(id => id !== JEWISH_CALENDAR.id));
    const [showJewishCalendar, setShowJewishCalendar] = useState(initialSelectedIdsProp.includes(JEWISH_CALENDAR.id!));
    const [showHebrewDate, setShowHebrewDate] = useState(initialSelectedIdsProp.includes('hebrew-date'));
    const [loadedCalendarIds, setLoadedCalendarIds] = useState<Set<string>>(new Set(initialSelectedIdsProp));
    const [loadingCalendars, setLoadingCalendars] = useState<Set<string>>(new Set());

    // Sync state with props (handling server-side navigation updates)
    useEffect(() => {
        const filteredInitial = initialSelectedIdsProp.filter(id => id !== JEWISH_CALENDAR.id && id !== 'hebrew-date');
        setVisibleCalendarIds(filteredInitial);
        setShowJewishCalendar(initialSelectedIdsProp.includes(JEWISH_CALENDAR.id!));
        setShowHebrewDate(initialSelectedIdsProp.includes('hebrew-date'));

        // Remove JEWISH_CALENDAR from available list
        setAvailableCalendars(allCalendars);

        setLoadedCalendarIds(prev => {
            const next = new Set(prev);
            initialSelectedIdsProp.forEach(id => next.add(id));
            return next;
        });
        setAllEvents(prev => {
            const freshIds = new Set(initialSelectedIdsProp);
            // Keep cached events for calendars NOT currently in server props
            const cached = prev.filter(e => e._calendarId && !freshIds.has(e._calendarId));
            // Merge with fresh events from server
            return [...cached, ...initialEventsProp];
        });
    }, [initialEventsProp, initialSelectedIdsProp, allCalendars]);

    // Generate Jewish Holidays for all years in range (Israel schedule)
    const jewishHolidays = React.useMemo(
        () => getJewishHolidays(startDate, endDate),
        [startDate, endDate],
    );

    // Pre-calculate Calendar Colors Map
    const calendarColorMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        availableCalendars.forEach(cal => {
            if (cal.id && cal.backgroundColor) {
                map[cal.id] = cal.backgroundColor;
            }
        });
        return map;
    }, [availableCalendars]);

    // Coloring Function
    const getEventColor = (event: CalendarEvent) => {
        // Mode 1: Multi-Calendar View -> Use Calendar Color
        if (visibleCalendarIds.length > 1) {
            return calendarColorMap[event._calendarId || ''] || 'var(--event-bar-bg, #3d7eff)';
        }

        // Mode 2: Single-Calendar View -> Try Event Color, fallback to Calendar Color
        if (event.colorId && eventColors && eventColors[event.colorId]) {
            return eventColors[event.colorId].background;
        }

        // Fallback
        return calendarColorMap[event._calendarId || ''] || 'var(--event-bar-bg, #3d7eff)';
    };


    useEffect(() => {
        // Simple check: if current year is in range
        const today = new Date();
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        const todayStr = format(today, 'yyyy-MM-dd');

        if (todayStr >= startStr && todayStr <= endStr) {
            // Maybe wait a tick for render?
            setTimeout(() => {
                const todayEl = document.getElementById('today-cell');
                if (todayEl) {
                    todayEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }, 100);
        }
    }, [startDate, endDate]);

    // Restore Theme Initialization
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            setTheme('light');
            document.documentElement.setAttribute('data-theme', 'light');
        }

        const savedShowWeeks = localStorage.getItem('showWeeks');
        if (savedShowWeeks !== null) {
            setShowWeeks(savedShowWeeks === 'true');
        }
    }, []);

    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const mainGridRef = React.useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleExportCSV = () => {
        // Filter visible events
        const visible = allEvents.filter(e => !e._calendarId || visibleCalendarIds.includes(e._calendarId));

        // Sort by date
        visible.sort((a, b) => {
            const da = new Date(a.start?.dateTime || a.start?.date || 0);
            const db = new Date(b.start?.dateTime || b.start?.date || 0);
            return da.getTime() - db.getTime();
        });

        // CSV Header
        let csvContent = "Subject,Start Date,Start Time,End Date,End Time,All Day,Description,Location\n";

        visible.forEach(e => {
            const start = e.start?.dateTime || e.start?.date;
            const end = e.end?.dateTime || e.end?.date;

            if (!start) return;

            const startDate = parseISO(start);
            const endDate = end ? parseISO(end) : startDate;

            const isAllDay = !!e.start?.date;

            // Format
            const sDate = format(startDate, 'yyyy-MM-dd');
            const sTime = isAllDay ? '' : format(startDate, 'HH:mm');
            const eDate = format(endDate, 'yyyy-MM-dd');
            const eTime = isAllDay ? '' : format(endDate, 'HH:mm');

            // Escape helper
            const esc = (s: string | null | undefined) => {
                if (!s) return '';
                const clean = s.replace(/"/g, '""'); // Escape quotes
                if (clean.includes(',') || clean.includes('\n') || clean.includes('"')) {
                    return `"${clean}"`;
                }
                return clean;
            };

            const row = [
                esc(e.summary),
                sDate,
                sTime,
                eDate,
                eTime,
                isAllDay ? 'True' : 'False',
                esc(e.description),
                esc(e.location)
            ].join(',');
            csvContent += row + "\n";
        });

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `calendar_export_${format(startDate, 'yyyy-MM')}_to_${format(endDate, 'yyyy-MM')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = async () => {
        if (!mainGridRef.current) return;
        setIsExporting(true);
        try {
            // Wait a moment for any render updates
            await new Promise(r => setTimeout(r, 100));

            const canvas = await html2canvas(mainGridRef.current, {
                scale: 2, // Better quality
                useCORS: true,
                logging: false,
                backgroundColor: theme === 'dark' ? '#000000' : '#ffffff', // Ensure bg is captured
                windowWidth: mainGridRef.current.scrollWidth + 100, // Ensure full width is rendered
                windowHeight: mainGridRef.current.scrollHeight + 100,
                onclone: (clonedDoc, element) => {
                    // 1. Fix Sticky Overlay: Remove sticky positioning from headers in the clone

                    const headers = element.querySelectorAll('[class*="headerCell"]');
                    headers.forEach((el: any) => {
                        el.style.position = 'static';
                        el.style.transform = 'none'; // reset any transforms
                    });

                    const monthLabels = element.querySelectorAll('[class*="monthLabelColumn"]');
                    monthLabels.forEach((el: any) => {
                        el.style.position = 'static';
                        el.style.left = 'auto';
                    });

                    // 2. Remove Rosh Chodesh Borders for Cleaner PDF
                    const roshChodeshCells = element.querySelectorAll('[class*="roshChodeshMarker"]');
                    roshChodeshCells.forEach((el: any) => {
                        el.style.boxShadow = 'none';
                    });
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            // Add Margin to PDF (20px visual * scale 2 = 40px)
            const margin = 40;
            const pdfWidth = imgWidth + (margin * 2);
            const pdfHeight = imgHeight + (margin * 2);

            // Create PDF with custom size matching the content plus margin
            const pdf = new jsPDF({
                orientation: pdfWidth > pdfHeight ? 'l' : 'p',
                unit: 'px',
                format: [pdfWidth, pdfHeight]
            });

            // Fill Background
            pdf.setFillColor(theme === 'dark' ? '#000000' : '#ffffff');
            pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

            pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
            pdf.save(`calendar_view_${format(startDate, 'yyyy-MM')}_to_${format(endDate, 'yyyy-MM')}.pdf`);

        } catch (err) {
            console.error("PDF Export failed", err);
            alert("Export failed");
        } finally {
            setIsExporting(false);
        }
    };

    // --- Drag to Create Logic ---
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartDay, setDragStartDay] = useState<Date | null>(null);
    const [dragEndDay, setDragEndDay] = useState<Date | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createRange, setCreateRange] = useState<{ start: Date, end: Date } | null>(null);
    const [editingEvent, setEditingEvent] = useState<any>(null); // For Edit Mode

    const [isCreatingCalendarLoading, setIsCreatingCalendarLoading] = useState(false);

    const handleCreateCalendar = async (newCalendarName: string) => {
        if (!newCalendarName.trim()) return;
        setIsCreatingCalendarLoading(true);
        try {
            const res = await createCalendarAction(newCalendarName);
            if (res.success && res.data) {
                const newCal = res.data;
                // Add to available calendars
                const newEntry: CalendarListEntry = {
                    id: newCal.id,
                    summary: newCal.summary,
                    backgroundColor: '#9e9e9e', // Default color until refresh or if not provided
                    foregroundColor: '#000000',
                    primary: false
                };
                setAvailableCalendars(prev => [...prev, newEntry]);

                if (newCal.id) {
                    const validId = newCal.id;
                    // Select and load it (it's empty initially)
                    setVisibleCalendarIds(prev => [...prev, validId]);
                    setLoadedCalendarIds(prev => { const n = new Set(prev); n.add(validId); return n; });
                }

                // Success handled by CalendarFilter reseting state
            } else {
                alert("Failed to create calendar: " + (res.error || "Unknown error"));
            }
        } catch (e) {
            console.error(e);
            alert("Error creating calendar");
        } finally {
            setIsCreatingCalendarLoading(false);
        }
    };

    const onMouseDownDay = (day: Date, e: React.MouseEvent) => {
        // Only left click
        if (e.button !== 0) return;
        setIsDragging(true);
        setDragStartDay(day);
        setDragEndDay(day);
    };

    const onMouseEnterDay = (day: Date) => {
        if (isDragging && dragStartDay) {
            setDragEndDay(day);
        }
    };

    // Global MouseUp to complete drag
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging && dragStartDay && dragEndDay) {
                // Determine range (handle backwards drag)
                const start = dragStartDay < dragEndDay ? dragStartDay : dragEndDay;
                const end = dragStartDay < dragEndDay ? dragEndDay : dragStartDay;

                setIsDragging(false);
                setDragStartDay(null);
                setDragEndDay(null);

                // If single day click (start === end), usually we want Details.
                // But dragging even 1 pixel might trigger this if we aren't careful.
                // Current logic: click opens Details via onClick. 
                // We need to differentiate Click vs Drag.
                // If they are same day, let onClick handle it (DayDetail).
                // If different, open CreateModal.

                if (!isSameDay(start, end)) {
                    setCreateRange({ start, end });
                    setEditingEvent(null); // Clear editing state
                    setIsCreateModalOpen(true);
                }
            } else {
                // Just reset if weird state
                setIsDragging(false);
                setDragStartDay(null);
                setDragEndDay(null);
            }
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [isDragging, dragStartDay, dragEndDay]);

    const isDaySelected = (day: Date) => {
        if (!isDragging || !dragStartDay || !dragEndDay) return false;
        const start = dragStartDay < dragEndDay ? dragStartDay : dragEndDay;
        const end = dragStartDay < dragEndDay ? dragEndDay : dragStartDay;
        // Simple comparison
        return day >= start && day <= end;
    };

    const handleSaveSuccess = (newEvent: any) => {
        // Optimistic update or refetch
        // For simplicity, just refetch or rely on revalidation if we had it.
        // Let's manually append for now to be snappy, or better: force re-fetch.
        // Actually, 'fetchEvents' logic needs to be triggered.
        // We can just add it to 'allEvents' state.
        setAllEvents(prev => {
            // If update, replace. If create, push.
            const exists = prev.find(e => e.id === newEvent.id);
            if (exists) {
                return prev.map(e => e.id === newEvent.id ? newEvent : e);
            }
            return [...prev, newEvent];
        });
    };

    const handleDeleteSuccess = (eventId: string) => {
        setAllEvents(prev => prev.filter(e => e.id !== eventId));
    };

    const handleEventClick = (event: CalendarEvent) => {
        setEditingEvent(event);
        setCreateRange(null); // Ensure we are not in create mode range
        setIsCreateModalOpen(true);
    };


    useEffect(() => {
        // Simple check: if current year is in range
        const today = new Date();
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        const todayStr = format(today, 'yyyy-MM-dd');

        if (todayStr >= startStr && todayStr <= endStr) {
            // Maybe wait a tick for render?
            setTimeout(() => {
                const todayEl = document.getElementById('today-cell');
                if (todayEl) {
                    todayEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }, 100);
        }
    }, [startDate, endDate]);

    // Filter toggle handler
    const handleCalendarToggle = async (calId: string) => {
        const isVisible = visibleCalendarIds.includes(calId);
        const newVisibleIds = isVisible
            ? visibleCalendarIds.filter(id => id !== calId)
            : [...visibleCalendarIds, calId];

        // 1. Optimistic Update (Immediate Feedback)
        setVisibleCalendarIds(newVisibleIds);

        // 2. Fetch Data if showing and not loaded
        if (!isVisible && !loadedCalendarIds.has(calId)) {
            setLoadingCalendars(prev => { const n = new Set(prev); n.add(calId); return n; });
            try {
                const newEvents = await fetchCalendarEventsAction([calId], startDate, endDate);
                setAllEvents(prev => [...prev, ...newEvents]);
                setLoadedCalendarIds(prev => { const n = new Set(prev); n.add(calId); return n; });
            } catch (err) {
                console.error("Failed to fetch calendar events asynchronously:", err);
            } finally {
                setLoadingCalendars(prev => { const n = new Set(prev); n.delete(calId); return n; });
            }
        }

        // 3. Update URL (Background). Preserve the virtual overlays (Jewish
        // holidays / Hebrew date) so toggling a real calendar doesn't drop them
        // from the URL — which would make the server round-trip reset them off.
        const params = applyCalendarsParam(new URLSearchParams(window.location.search), {
            regularIds: newVisibleIds,
            showJewishCalendar,
            showHebrewDate,
        });
        router.push(`/?${params.toString()}`, { scroll: false });
    };


    const toggleTheme = () => {
        setTheme(prev => {
            const newTheme = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            document.documentElement.setAttribute('data-theme', newTheme);
            return newTheme;
        });
    };

    const toggleGridlines = () => setShowGridlines(prev => !prev);
    const toggleSeparators = () => setShowSeparators(prev => !prev);

    const jumpToToday = () => {
        const today = new Date();
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        const todayStr = format(today, 'yyyy-MM-dd');

        if (todayStr >= startStr && todayStr <= endStr) {
            const todayEl = document.getElementById('today-cell');
            if (todayEl) {
                todayEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
        } else {
            // Navigate to current year
            const currentYear = new Date().getFullYear();
            router.push(`/?year=${currentYear}`);
        }
    };

    // Helper: Change Range
    const changeRange = (newStart: Date, newEnd: Date) => {
        const params = new URLSearchParams(window.location.search);
        params.delete('year');
        params.set('start', format(newStart, 'yyyy-MM'));
        params.set('end', format(newEnd, 'yyyy-MM'));

        router.push(`/?${params.toString()}`);
    };



    // 1. Generate months for the selected range
    // 2. For each month, determine start day (0=Sun, 6=Sat)
    // 3. Render row: Month Label + Padding Cells + Day Cells

    const months = React.useMemo(() => {
        const monthStarts = eachMonthOfInterval({ start: startDate, end: endDate });
        return monthStarts.map(start => {
            const end = endOfMonth(start);
            const days = eachDayOfInterval({ start, end });
            const padding = getDay(start); // 0 (Sun) to 6 (Sat)
            const trailingPadding = 37 - (padding + days.length);

            return {
                name: format(start, 'MMM yyyy', { locale: he }), // Added year to name for clarity in multi-year view
                days,
                padding,
                trailingPadding
            };
        });
    }, [startDate, endDate]);

    // Header Row: Su Mo Tu... repeated enough times to cover max width?
    // User wants "Aligned Columns".
    // If we have 37 columns (31 days + max 6 padding), we need headers for all using Modulo 7.
    const headerCols = Array.from({ length: 37 }, (_, i) => {
        const dayIndex = i % 7;
        return ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'][dayIndex];
    });

    // Build the grid layout (single-day map + multi-day segment tracks) from the
    // currently-visible events, plus the holiday styling overlay.
    const { eventsMap, multiDaySegments, maxTracksPerDay, holidayStylingMap } = React.useMemo(() => {
        // Filter events based on visibility
        const activeEvents = allEvents.filter(e => !e._calendarId || visibleCalendarIds.includes(e._calendarId));

        const layout = buildEventLayout(activeEvents);

        // Holidays are rendered as cell styling/labels, not as calendar events.
        const holidayStylingMap = showJewishCalendar ? buildHolidayStylingMap(jewishHolidays) : {};

        return { ...layout, holidayStylingMap };
    }, [allEvents, visibleCalendarIds, jewishHolidays, showJewishCalendar]);


    const getEventsForDay = (day: Date) => {
        const key = format(day, 'yyyy-MM-dd');
        return {
            single: eventsMap[key] || [],
            multi: multiDaySegments[key] || []
        };
    };



    const toggleJewishCalendar = () => {
        const newValue = !showJewishCalendar;
        setShowJewishCalendar(newValue);

        // Recombine the whole selection so we never clobber other toggles.
        const params = applyCalendarsParam(new URLSearchParams(window.location.search), {
            regularIds: visibleCalendarIds,
            showJewishCalendar: newValue,
            showHebrewDate,
        });
        router.push(`/?${params.toString()}`, { scroll: false });
    };

    const toggleHebrewDate = () => {
        const newValue = !showHebrewDate;
        setShowHebrewDate(newValue);

        const params = applyCalendarsParam(new URLSearchParams(window.location.search), {
            regularIds: visibleCalendarIds,
            showJewishCalendar,
            showHebrewDate: newValue,
        });
        router.push(`/?${params.toString()}`, { scroll: false });
    };


    return (
        <div className={styles.container}>
            <CalendarHeader
                startDate={startDate}
                endDate={endDate}
                onJumpToToday={jumpToToday}
                onChangeRange={changeRange}
                showJewishCalendar={showJewishCalendar}
                onToggleJewishCalendar={toggleJewishCalendar}
                showHebrewDate={showHebrewDate}
                onToggleHebrewDate={toggleHebrewDate}
                allCalendars={availableCalendars}
                visibleCalendarIds={visibleCalendarIds}
                onCalendarToggle={handleCalendarToggle}
                loadingCalendars={loadingCalendars}
                onCreateCalendar={handleCreateCalendar}
                isCreatingCalendarLoading={isCreatingCalendarLoading}
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                isExporting={isExporting}
                showWeeks={showWeeks}
                onToggleWeeks={() => {
                    const newValue = !showWeeks;
                    setShowWeeks(newValue);
                    localStorage.setItem('showWeeks', String(newValue));
                }}
                showGridlines={showGridlines}
                onToggleGridlines={toggleGridlines}
                showSeparators={showSeparators}
                onToggleSeparators={toggleSeparators}
                theme={theme}
                onToggleTheme={toggleTheme}
            />

            {/* Create / Edit Event Modal */}
            <CreateEventModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                initialDateRange={createRange}
                calendars={availableCalendars}
                defaultCalendarId={visibleCalendarIds[0]} // Default to first visible
                eventColors={eventColors}
                onSaveSuccess={handleSaveSuccess}
                initialEvent={editingEvent}
                onDeleteSuccess={handleDeleteSuccess}
            />

            {/* Day Detail Modal */}
            {selectedDay && (
                <DayDetailModal
                    date={selectedDay}
                    events={getEventsForDay(selectedDay).single.concat(getEventsForDay(selectedDay).multi.map(s => s.event))}
                    onClose={() => setSelectedDay(null)}
                    onCreate={() => {
                        // Open create modal for this day
                        const start = selectedDay;
                        const end = selectedDay;
                        setCreateRange({ start, end });
                        setEditingEvent(null);
                        setIsCreateModalOpen(true);
                        setSelectedDay(null); // Close detail modal
                    }}
                    onEventClick={(event) => {
                        handleEventClick(event);
                        setSelectedDay(null);
                    }}
                />
            )}


            <div className={`${styles.viewContainer} ${!showGridlines ? styles.hideGridlines : ''} ${!showSeparators ? styles.hideSeparators : ''}`}>
                <div
                    className={`${styles.mainGrid} ${!showWeeks ? styles.compactGrid : ''}`}
                    ref={mainGridRef}
                    style={{ rowGap: showWeeks ? '24px' : '8px' }}
                >
                    {/* Header Row */}
                    <div className={styles.headerCell} style={{ gridColumn: 1 }}>חודש</div> {/* Month Col Header */}
                    {headerCols.map((day, i) => {
                        const isSunday = i % 7 === 0;
                        const isShabbat = i % 7 === 6;
                        return (
                            <div
                                key={i}
                                className={`${styles.headerCell} ${isSunday ? styles.sunday : ''} ${isShabbat ? styles.weekSeparator : ''}`}
                            >
                                {day}
                            </div>
                        );
                    })}

                    {/* Month Rows */}
                    {months.map((month, mIndex) => {
                        return (
                            <React.Fragment key={mIndex}>
                                {/* Month Label */}
                                <div className={styles.monthLabelColumn}>
                                    {month.name}
                                </div>

                                {/* Padding Cells (Empty) */}
                                {Array.from({ length: month.padding }).map((_, i) => (
                                    <div key={`pad-${mIndex}-${i}`} className={`${styles.dayCell} ${styles.empty}`} />
                                ))}


                                {/* Day Cells */}
                                {month.days.map((day, index) => {
                                    const { single, multi } = getEventsForDay(day);
                                    const isDayToday = isToday(day);
                                    const dayOfWeek = getDay(day);
                                    const isShabbat = dayOfWeek === 6; // Saturday
                                    const isFriday = dayOfWeek === 5;
                                    const weekNum = getWeek(day);

                                    const dayKey = format(day, 'yyyy-MM-dd');
                                    const maxPosition = maxTracksPerDay[dayKey] || 0;
                                    const holidayStyle = holidayStylingMap[dayKey];

                                    const isSunday = getDay(day) === 0;

                                    // Hebrew Date Logic (Option C: Milestone Marker)
                                    let hebrewDateStr = '';
                                    let hebrewMonthName = '';
                                    if (showHebrewDate) {
                                        const hd = new HDate(day);
                                        hebrewDateStr = gematriya(hd.getDate());
                                        if (hd.getDate() === 1) {
                                            hebrewMonthName = Locale.gettext(hd.getMonthName(), 'he');
                                        }
                                    }

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            id={isDayToday ? 'today-cell' : undefined}
                                            onMouseDown={(e) => onMouseDownDay(day, e)}
                                            onMouseEnter={() => onMouseEnterDay(day)}
                                            onClick={() => {
                                                // Only open detail if it wasn't a drag
                                                // Actually, mouseup happens before click.
                                                // If we had a multi-day drag, mouseup handled it and cleared state.
                                                // But 'onClick' still fires on mouse release.
                                                // We can check if we JUST finished a drag... but state is cleared.
                                                // Simple hack: if IS creating modal, don't open details.
                                                // But Creating Modal opens on mouseup.
                                                // Let's rely on standard Click for single day. 
                                                // If we dragged multi-day, Create modal is open.
                                                // We might need to stop propagation or prevent default?
                                                if (isCreateModalOpen) return;
                                                setSelectedDay(day);
                                            }}
                                            className={`
                                                ${styles.dayCell} 
                                                ${isDayToday ? styles.today : ''}
                                                ${(holidayStyle?.isYomTov || isShabbat) ? styles.shabbat : ((holidayStyle?.isCholHamoed || isFriday) ? styles.friday : '')}
                                                ${isSunday ? styles.sunday : ''}
                                                ${isShabbat ? styles.weekSeparator : ''}
                                                ${hebrewMonthName ? styles.roshChodeshMarker : ''}
                                                ${isDaySelected(day) ? styles.selected : ''}
                                            `}
                                            style={{
                                                // RTL Fix: Ensure earlier days (Right) are above later days (Left) 
                                                // so that events extending leftwards are visible over the next cell's background.
                                                zIndex: month.days.length - index,
                                            }}
                                            title={`${format(day, 'dd/MM/yyyy')} (${single.length + multi.length} אירועים)`}
                                        >
                                            {showWeeks && isSunday && (
                                                <span className={styles.weekNumLabel}>שבוע {weekNum}</span>
                                            )}
                                            <div className={styles.dayHeader}>
                                                <div className={styles.dayNumber} style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
                                                    <span>{format(day, 'd')}</span>
                                                    {hebrewDateStr && (
                                                        <span style={{ fontSize: '0.7em', fontWeight: 400, opacity: 0.8 }}>{hebrewDateStr}</span>
                                                    )}
                                                </div>

                                                {/* Hebrew Month Label (New Line, Bold) */}
                                                {hebrewMonthName && (
                                                    <div style={{
                                                        fontSize: '0.7rem',
                                                        fontWeight: 'bold',
                                                        color: '#FFB74D', // Use direct accent color for visibility
                                                        lineHeight: 1,
                                                        marginTop: '2px'
                                                    }}>
                                                        {hebrewMonthName}
                                                    </div>
                                                )}

                                                {/* Holiday Label */}
                                                {holidayStyle && (
                                                    <div className={styles.holidayLabel} style={{ fontSize: '0.65rem', color: holidayStyle.isYomTov ? 'inherit' : 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.1, marginTop: '2px' }}>

                                                        {holidayStyle.isFast && (
                                                            <span title="יום צום" style={{ marginInlineEnd: '4px' }}>🍽️</span>
                                                        )}
                                                        {holidayStyle.text}
                                                    </div>
                                                )}

                                                {/* Single day events indicator: a thin circle with count */}
                                                {single.length > 0 && (
                                                    <div className={styles.singleDayIndicator} title={`${single.length} אירועים בודדים`}>
                                                        {single.length}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Render Multi-Day Bars with stable tracks */}
                                            <div className={styles.multiDayContainer}>
                                                {Array.from({ length: maxPosition }).map((_, trackIdx) => {
                                                    const seg = multi.find(s => s.position === trackIdx);

                                                    // Placeholder for empty track or non-visual-start segments
                                                    if (!seg) return <div key={trackIdx} className={styles.emptyTrack} />;

                                                    // Visual Start: It's the absolute start of the event OR the first day of the displayed month/row
                                                    // (Assuming 'day' is iterated in order and splits by month)
                                                    const isVisualStart = seg.isStart || day.getDate() === 1;

                                                    if (isVisualStart) {
                                                        // Calculate visual span: Min of (Time to Event End) and (Time to Month End)
                                                        const monthEnd = month.days[month.days.length - 1]; // Last day of current month view

                                                        // We need simpler logic:
                                                        // We are at 'day'. 
                                                        // Event goes until 'seg.realEnd'.
                                                        // Month goes until 'monthEnd'.
                                                        // Limit is whichever comes first.

                                                        // Compare dates to determine visual end
                                                        const visualEndDate = (seg.realEnd < monthEnd) ? seg.realEnd : monthEnd;

                                                        const span = differenceInCalendarDays(visualEndDate, day) + 1;

                                                        // Determine visual flags for this specific bar
                                                        const isVisualBlockRealStart = seg.isStart;
                                                        const isVisualBlockRealEnd = isSameDay(visualEndDate, seg.realEnd);

                                                        // Width Adjustment Logic:
                                                        // Base width is spans * column_width.
                                                        // We need to adjust for the start/end styling caps (margins).
                                                        // - If Start Cap (isVisualBlockRealStart): Margin is 6px (inset). We effectively shift RightPos by +6px, so we lose 6px width. (-6)
                                                        // - If No Start Cap (Bridge): Margin is -3px (outset). We shift RightPos by -3px, so we gain 3px width. (+3)
                                                        // - If End Cap (isVisualBlockRealEnd): We want to stop 6px before the edge. (-6)
                                                        // - If No End Cap (Bridge): We want to extend 3px beyond the edge. (+3)

                                                        const startAdj = isVisualBlockRealStart ? -6 : 3;
                                                        // Fix: if it's the real end, we want it to almost fill the cell, not stop short. 
                                                        // Previous -6 was too much. Let's try -2 or 0.
                                                        const endAdj = isVisualBlockRealEnd ? -2 : 3;
                                                        const totalAdj = startAdj + endAdj;

                                                        const eventColor = getEventColor(seg.event);
                                                        const textColor = getContrastColor(eventColor);
                                                        const textShadow = textColor === '#ffffff' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none';

                                                        return (
                                                            <div
                                                                key={(seg.event.id || 'evt') + trackIdx}
                                                                className={`
                                                                                ${styles.multiDayBar} 
                                                                                ${isVisualBlockRealStart ? styles.start : ''} 
                                                                                ${isVisualBlockRealEnd ? styles.end : ''}
                                                                            `}
                                                                style={{
                                                                    backgroundColor: eventColor,
                                                                    color: textColor,
                                                                    textShadow: textShadow,
                                                                    width: `calc((100% + 13px) * ${span} - 13px + ${totalAdj}px)`,
                                                                    zIndex: 10
                                                                }}
                                                                title={seg.event.summary || ''}
                                                                onMouseDown={(e) => { e.stopPropagation(); }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); // Prevent cell click
                                                                    handleEventClick(seg.event);
                                                                }}
                                                            >
                                                                <span className={styles.barLabel}>{seg.event.summary || ''}</span>
                                                            </div>
                                                        );
                                                    } else {
                                                        // Non-visual start (continuation from previous month/row is impossible if we split by month, 
                                                        // but continuation from previous DAY in same month is handled here)
                                                        // We render an invisible placeholder to keep the vertical stack aligned
                                                        return (
                                                            <div
                                                                key={trackIdx}
                                                                className={styles.multiDayBar}
                                                                style={{ visibility: 'hidden', height: '18px' }} // Ensure height matches
                                                            />
                                                        );
                                                    }
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Trailing Padding (Empty) to complete the 38-column row */}
                                {Array.from({ length: month.trailingPadding }).map((_, i) => (
                                    <div key={`trail-${mIndex}-${i}`} className={`${styles.dayCell} ${styles.empty}`} />
                                ))}

                                {mIndex < months.length - 1 && (
                                    <div className={styles.monthDivider} style={{ gridColumn: '1 / -1' }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div >
    );
}
