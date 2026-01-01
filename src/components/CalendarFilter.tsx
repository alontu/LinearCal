'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './CalendarFilter.module.css';
import { CalendarListEntry } from '@/lib/google-calendar';

interface CalendarFilterProps {
    availableCalendars: CalendarListEntry[];
    visibleCalendarIds: string[];
    onToggle: (calId: string) => void;
    loadingCalendars: Set<string>;
    onCreateCalendar: (name: string) => Promise<void>;
    isCreatingLoading?: boolean;
}

export default function CalendarFilter({
    availableCalendars,
    visibleCalendarIds,
    onToggle,
    loadingCalendars,
    onCreateCalendar,
    isCreatingLoading = false
}: CalendarFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsCreating(false); // Reset create mode too
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleCreateSubmit = async () => {
        if (!newName.trim()) return;
        await onCreateCalendar(newName);
        setIsCreating(false);
        setNewName("");
    };

    return (
        <div className={styles.container} ref={containerRef}>
            <button onClick={() => setIsOpen(!isOpen)} className={styles.button}>
                📅 יומנים
            </button>
            {isOpen && (
                <div className={styles.dropdown}>
                    {availableCalendars.map(cal => (
                        <label key={cal.id} className={styles.item}>
                            <input
                                type="checkbox"
                                checked={visibleCalendarIds.includes(cal.id!)}
                                onChange={() => onToggle(cal.id!)}
                                disabled={loadingCalendars.has(cal.id!)}
                            />
                            <span style={{ color: cal.backgroundColor || 'inherit' }}>
                                {loadingCalendars.has(cal.id!) ? '⏳' : '●'}
                            </span>
                            <span style={{ opacity: loadingCalendars.has(cal.id!) ? 0.7 : 1 }}>
                                {cal.summary}
                            </span>
                        </label>
                    ))}

                    <div className={styles.divider} />

                    {isCreating ? (
                        <div className={styles.createRow}>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="שם יומן חדש"
                                className={styles.input}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateSubmit();
                                    if (e.key === 'Escape') setIsCreating(false);
                                }}
                            />
                            <button onClick={handleCreateSubmit} disabled={isCreatingLoading} className={styles.iconButton}>
                                {isCreatingLoading ? '...' : '✓'}
                            </button>
                            <button onClick={() => setIsCreating(false)} className={styles.iconButton}>✕</button>
                        </div>
                    ) : (
                        <button
                            className={styles.createButton}
                            onClick={() => setIsCreating(true)}
                        >
                            <span className={styles.plusIcon}>+</span> יומן חדש
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
