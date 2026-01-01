'use client';

import React, { useState, useRef, useEffect } from 'react';
import { format, addYears, endOfMonth } from 'date-fns';
import DatePicker, { registerLocale } from 'react-datepicker';
import { he } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import styles from './CalendarHeader.module.css';

registerLocale('he', he);
import { CalendarListEntry } from '@/lib/google-calendar';
import CalendarFilter from './CalendarFilter';
import { signOut } from 'next-auth/react';

interface CalendarHeaderProps {
    startDate: Date;
    endDate: Date;
    onJumpToToday: () => void;
    onChangeRange: (start: Date, end: Date) => void;
    showJewishCalendar: boolean;
    onToggleJewishCalendar: () => void;
    showHebrewDate: boolean;
    onToggleHebrewDate: () => void;

    // Filter props
    allCalendars: CalendarListEntry[];
    visibleCalendarIds: string[];
    onCalendarToggle: (calId: string) => void;
    loadingCalendars: Set<string>;
    onCreateCalendar: (name: string) => Promise<void>;
    isCreatingCalendarLoading?: boolean;

    // Export props
    onExportPDF: () => void;
    onExportCSV: () => void;
    isExporting: boolean;

    // Theme & View controls
    showWeeks: boolean;
    onToggleWeeks: () => void;
    showGridlines: boolean;
    onToggleGridlines: () => void;
    showSeparators: boolean;
    onToggleSeparators: () => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
}

export default function CalendarHeader({
    startDate,
    endDate,
    onJumpToToday,
    onChangeRange,
    showJewishCalendar,
    onToggleJewishCalendar,
    showHebrewDate,
    onToggleHebrewDate,
    allCalendars,
    visibleCalendarIds,
    onCalendarToggle,
    loadingCalendars,
    onCreateCalendar,
    isCreatingCalendarLoading,
    onExportPDF,
    onExportCSV,
    isExporting,
    showWeeks,
    onToggleWeeks,
    showGridlines,
    onToggleGridlines,
    showSeparators,
    onToggleSeparators,
    theme,
    onToggleTheme
}: CalendarHeaderProps) {
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
    const rangePickerRef = useRef<HTMLDivElement>(null);
    const [pickerStart, setPickerStart] = useState<Date>(startDate);
    const [pickerEnd, setPickerEnd] = useState<Date>(endDate);

    useEffect(() => {
        if (!isRangePickerOpen) {
            setPickerStart(startDate);
            setPickerEnd(endDate);
        }
    }, [isRangePickerOpen, startDate, endDate]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
            if (rangePickerRef.current && !rangePickerRef.current.contains(event.target as Node)) {
                setIsRangePickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className={styles.header}>
            <div className={styles.titleGroup}>
                <div className={styles.title}>
                    {startDate.getFullYear() === endDate.getFullYear()
                        ? `שנה ${startDate.getFullYear()}`
                        : `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`}
                </div>

                <button onClick={onJumpToToday} className={styles.todayButton}>היום</button>
                <div className={styles.yearControls}>
                    <button onClick={() => onChangeRange(addYears(startDate, -1), addYears(endDate, -1))} className={styles.yearButton}>&lt;</button>
                    <button onClick={() => onChangeRange(addYears(startDate, 1), addYears(endDate, 1))} className={styles.yearButton}>&gt;</button>
                </div>

                {/* Range Picker */}
                <div className={styles.container} ref={rangePickerRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setIsRangePickerOpen(!isRangePickerOpen)}
                        className={styles.yearButton}
                        style={{ width: 'auto' }}
                    >
                        🗓️ טווח תאריכים
                    </button>
                    {isRangePickerOpen && (
                        <div className={styles.dropdown} style={{ padding: '16px', width: '300px', cursor: 'default' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>בחר טווח להצגה</h4>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>מ-</label>
                                <div dir="ltr"> {/* Force LTR for DatePicker input logic */}
                                    <DatePicker
                                        selected={pickerStart}
                                        onChange={(d) => d && setPickerStart(d)}
                                        showMonthYearPicker
                                        dateFormat="MMM yyyy"
                                        locale="he"
                                        className={styles.dateInput} // Assuming we might need styles or use inline
                                        customInput={<input style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>עד-</label>
                                <div dir="ltr">
                                    <DatePicker
                                        selected={pickerEnd}
                                        onChange={(d) => d && setPickerEnd(d)}
                                        showMonthYearPicker
                                        dateFormat="MMM yyyy"
                                        locale="he"
                                        customInput={<input style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    onChangeRange(pickerStart, endOfMonth(pickerEnd));
                                    setIsRangePickerOpen(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: 'var(--primary-color, #4285F4)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                הצג
                            </button>
                        </div>
                    )}
                </div>

                <button
                    onClick={onToggleJewishCalendar}
                    className={styles.yearButton}
                    style={{
                        backgroundColor: showJewishCalendar ? 'rgba(255, 183, 77, 0.2)' : 'transparent',
                        borderColor: showJewishCalendar ? '#FFB74D' : 'var(--border-color)',
                        color: showJewishCalendar ? '#FFB74D' : 'var(--text-primary)',
                        fontWeight: showJewishCalendar ? 'bold' : 'normal',
                    }}
                >
                    ✡️ חגים ומועדים
                </button>


                <button
                    onClick={onToggleHebrewDate}
                    className={styles.yearButton}
                    style={{
                        backgroundColor: showHebrewDate ? 'rgba(255, 183, 77, 0.2)' : 'transparent',
                        borderColor: showHebrewDate ? '#FFB74D' : 'var(--border-color)',
                        color: showHebrewDate ? '#FFB74D' : 'var(--text-primary)',
                        fontWeight: showHebrewDate ? 'bold' : 'normal',
                    }}
                >
                    🗓️ תאריך עברי
                </button>

                {/* Filter Component */}
                <CalendarFilter
                    availableCalendars={allCalendars}
                    visibleCalendarIds={visibleCalendarIds}
                    onToggle={onCalendarToggle}
                    loadingCalendars={loadingCalendars}
                    onCreateCalendar={onCreateCalendar}
                    isCreatingLoading={isCreatingCalendarLoading}
                />

                {/* Export Menu */}
                <div className={styles.container} ref={exportMenuRef}>
                    <button
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        className={styles.actionButton}
                        disabled={isExporting}
                        style={{ opacity: isExporting ? 0.7 : 1 }}
                    >
                        {isExporting ? '⏳...' : '📥 יצוא'}
                    </button>
                    {isExportMenuOpen && (
                        <div className={styles.dropdown}>
                            <div
                                className={styles.item}
                                onClick={() => { onExportPDF(); setIsExportMenuOpen(false); }}
                                style={{ borderBottom: '1px solid var(--border-color)' }}
                            >
                                📄 PDF (תמונה)
                            </div>
                            <div
                                className={styles.item}
                                onClick={() => { onExportCSV(); setIsExportMenuOpen(false); }}
                            >
                                📊 CSV (אקסל)
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={onToggleWeeks}
                    className={styles.themeToggle}
                    title={showWeeks ? "הסתר מספרי שבוע" : "הצג מספרי שבוע"}
                    style={{
                        fontSize: '1rem',
                        width: 'auto',
                        borderRadius: '8px',
                        opacity: showWeeks ? 1 : 0.4,
                        filter: showWeeks ? 'none' : 'grayscale(100%)'
                    }}
                >
                    #️⃣
                </button>
                <button
                    onClick={onToggleGridlines}
                    className={styles.themeToggle}
                    title={showGridlines ? "הסתר קווי רשת" : "הצג קווי רשת"}
                    style={{
                        fontSize: '1rem',
                        width: 'auto',
                        borderRadius: '8px',
                        opacity: showGridlines ? 1 : 0.4,
                        filter: showGridlines ? 'none' : 'grayscale(100%)',
                        color: 'var(--text-primary)'
                    }}
                >
                    ▦
                </button>
                <button
                    onClick={onToggleSeparators}
                    className={styles.themeToggle}
                    title={showSeparators ? "הסתר מפרידים" : "הצג מפרידים"}
                    style={{
                        fontSize: '1rem',
                        width: 'auto',
                        borderRadius: '8px',
                        opacity: showSeparators ? 1 : 0.4,
                        filter: showSeparators ? 'none' : 'grayscale(100%)',
                        color: 'var(--text-primary)'
                    }}
                >
                    ◫
                </button>
                <button onClick={onToggleTheme} className={styles.themeToggle} title={`עבור למצב ${theme === 'dark' ? 'בהיר' : 'כהה'}`}>
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.themeToggle} title="התנתק" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                    ⏻
                </button>
            </div>
        </header >
    );
}
