'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './CalendarHeader.module.css';
import { CalendarListEntry } from '@/lib/google-calendar';
import CalendarFilter from './CalendarFilter';
import { signOut } from 'next-auth/react';

interface CalendarHeaderProps {
    year: number;
    onJumpToToday: () => void;
    onChangeYear: (delta: number) => void;
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
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
}

export default function CalendarHeader({
    year,
    onJumpToToday,
    onChangeYear,
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
    theme,
    onToggleTheme
}: CalendarHeaderProps) {
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        if (isExportMenuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isExportMenuOpen]);

    return (
        <header className={styles.header}>
            <div className={styles.titleGroup}>
                <div className={styles.title}>שנה {year}</div>

                <button onClick={onJumpToToday} className={styles.todayButton}>היום</button>
                <div className={styles.yearControls}>
                    <button onClick={() => onChangeYear(-1)} className={styles.yearButton}>&lt;</button>
                    <button onClick={() => onChangeYear(1)} className={styles.yearButton}>&gt;</button>
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
                <button onClick={onToggleTheme} className={styles.themeToggle} title={`עבור למצב ${theme === 'dark' ? 'בהיר' : 'כהה'}`}>
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.themeToggle} title="התנתק" style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                    ⏻
                </button>
            </div>
        </header>
    );
}
