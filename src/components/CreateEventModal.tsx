'use client';

import React, { useState, useEffect } from 'react';
import styles from './CreateEventModal.module.css';
import { CalendarListEntry } from '@/lib/google-calendar';
import { createEventAction, updateEventAction, deleteEventAction } from '@/app/actions';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import {
    resolveEventCalendarId,
    tagEventCalendar,
    toInclusiveEndDate,
    buildEventPayload,
} from '@/lib/event-form';

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDateRange: { start: Date; end: Date } | null;
    calendars: CalendarListEntry[];
    defaultCalendarId: string;
    eventColors: any;
    onSaveSuccess: (event: any) => void;
    initialEvent?: any; // If provided, we are in EDIT mode
    onDeleteSuccess?: (eventId: string) => void;
}

export default function CreateEventModal({
    isOpen,
    onClose,
    initialDateRange,
    calendars,
    defaultCalendarId,
    eventColors,
    onSaveSuccess,
    initialEvent,
    onDeleteSuccess
}: CreateEventModalProps) {
    const isEditMode = !!initialEvent;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCalendarId, setSelectedCalendarId] = useState(defaultCalendarId);

    // Changing to Date objects for State
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());

    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [isAllDay, setIsAllDay] = useState(true);
    const [colorId, setColorId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Initialize state when modal opens
    useEffect(() => {
        if (isOpen) {
            setErrorMsg(null);
            if (initialEvent) {
                // Edit Mode
                setTitle(initialEvent.summary || '');
                setDescription(initialEvent.description || '');

                // Target the calendar the event actually lives in, so save/delete
                // hit the right calendar (not just the default visible one).
                setSelectedCalendarId(resolveEventCalendarId(initialEvent, defaultCalendarId));

                const s = initialEvent.start.dateTime || initialEvent.start.date;
                const e = initialEvent.end.dateTime || initialEvent.end.date;

                const isDateTime = !!initialEvent.start.dateTime;
                setIsAllDay(!isDateTime);

                const startD = new Date(s);
                const endD = new Date(e);

                if (isDateTime) {
                    // Extract Date and Time part
                    setStartDate(startD);
                    setStartTime(format(startD, 'HH:mm'));
                    setEndDate(endD);
                    setEndTime(format(endD, 'HH:mm'));
                } else {
                    // All Day
                    setStartDate(startD);
                    setStartTime('09:00'); // Default

                    // Google sends an exclusive end date for all-day events (end 14th
                    // means the event covers the 13th). Show the inclusive date.
                    setEndDate(toInclusiveEndDate(endD));

                    setEndTime('10:00'); // Default
                }

                setColorId(initialEvent.colorId || null);
            } else if (initialDateRange) {
                // Create Mode
                setTitle('');
                setDescription('');
                setSelectedCalendarId(defaultCalendarId);
                setStartDate(initialDateRange.start);
                setEndDate(initialDateRange.end);
                setStartTime('09:00');
                setEndTime('10:00');
                setIsAllDay(true); // Default to all day if dragging range
                setColorId(null);
            }
        }
    }, [isOpen, initialDateRange, initialEvent, defaultCalendarId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCalendarId || !startDate || !endDate) return;

        setIsSubmitting(true);
        setErrorMsg(null);

        const eventData = buildEventPayload({
            title,
            description,
            isAllDay,
            startDate,
            endDate,
            startTime,
            endTime,
            colorId,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

        try {
            let result;
            if (isEditMode) {
                result = await updateEventAction(selectedCalendarId, initialEvent.id, eventData);
            } else {
                result = await createEventAction(selectedCalendarId, eventData);
            }

            if (result.success) {
                // Tag the returned event with its calendar so visibility filtering
                // and later edits/deletes resolve to the correct calendar.
                onSaveSuccess(tagEventCalendar(result.data ?? {}, selectedCalendarId));
                onClose();
            } else {
                setErrorMsg('שגיאה בשמירת האירוע: ' + result.error);
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('אירעה שגיאה לא צפויה. נסה שוב.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('האם אתה בטוח שברצונך למחוק אירוע זה?')) return;

        setIsDeleting(true);
        setErrorMsg(null);
        try {
            const result = await deleteEventAction(selectedCalendarId, initialEvent.id);
            if (result.success) {
                if (onDeleteSuccess) onDeleteSuccess(initialEvent.id);
                onClose();
            } else {
                setErrorMsg('שגיאה במחיקת האירוע: ' + result.error);
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('שגיאה במחיקה. נסה שוב.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter out colors to show a reasonable set (colors object has keys like '1', '2'...)
    const colorKeys = eventColors ? Object.keys(eventColors).slice(0, 12) : [];

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={`${styles.modalContent} ph-no-capture`} onClick={e => e.stopPropagation()} dir="rtl">
                <h2 className={styles.title}>{isEditMode ? 'עריכת אירוע' : 'יצירת אירוע חדש'}</h2>

                {errorMsg && (
                    <div
                        role="alert"
                        style={{
                            background: 'rgba(220, 53, 69, 0.12)',
                            border: '1px solid #dc3545',
                            color: '#b02a37',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            marginBottom: '12px',
                            fontSize: '0.9rem',
                        }}
                    >
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>כותרת</label>
                        <input
                            className={styles.input}
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="שם האירוע"
                            autoFocus
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.checkboxLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={isAllDay}
                                onChange={e => setIsAllDay(e.target.checked)}
                            />
                            <span>כל היום</span>
                        </label>
                    </div>

                    <div className={styles.dateRow}>
                        <div className={`${styles.formGroup} ${styles.datePickerWrapper}`} style={{ flex: 1 }}>
                            <label className={styles.label}>התחלה</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <DatePicker
                                        selected={startDate}
                                        onChange={(date: Date | null) => setStartDate(date)}
                                        dateFormat="dd/MM/yyyy"
                                        className={styles.input} /* This might be overridden by wrapper style, checked css module */
                                    />
                                </div>
                                {!isAllDay && (
                                    <input
                                        className={styles.input}
                                        type="time"
                                        value={startTime}
                                        onChange={e => setStartTime(e.target.value)}
                                        style={{ width: '100px' }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.dateRow}>
                        <div className={`${styles.formGroup} ${styles.datePickerWrapper}`} style={{ flex: 1 }}>
                            <label className={styles.label}>סיום</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <DatePicker
                                        selected={endDate}
                                        onChange={(date: Date | null) => setEndDate(date)}
                                        dateFormat="dd/MM/yyyy"
                                        className={styles.input}
                                        minDate={startDate || undefined}
                                    />
                                </div>
                                {!isAllDay && (
                                    <input
                                        className={styles.input}
                                        type="time"
                                        value={endTime}
                                        onChange={e => setEndTime(e.target.value)}
                                        style={{ width: '100px' }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>יומן</label>
                        <select
                            className={styles.select}
                            value={selectedCalendarId}
                            onChange={e => setSelectedCalendarId(e.target.value)}
                            disabled={isEditMode} // Disable calendar change for now to simplify
                        >
                            {calendars.map(cal => (
                                <option key={cal.id} value={cal.id || ''}>{cal.summary}</option>
                            ))}
                        </select>
                    </div>

                    {colorKeys.length > 0 && (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>צבע</label>
                            <div className={styles.colorGrid}>
                                <div
                                    className={`${styles.colorOption} ${!colorId ? styles.selected : ''}`}
                                    style={{ background: 'conic-gradient(red, yellow, green, blue)' }} // Default/Auto
                                    onClick={() => setColorId(null)}
                                    title="צבע ברירת מחדל"
                                />
                                {colorKeys.map(key => (
                                    <div
                                        key={key}
                                        className={`${styles.colorOption} ${colorId === key ? styles.selected : ''}`}
                                        style={{ backgroundColor: eventColors[key].background }}
                                        onClick={() => setColorId(key)}
                                        title={eventColors[key].foreground} // Just a hover hint
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>תיאור</label>
                        <textarea
                            className={styles.textarea}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="הוסף פרטים..."
                        />
                    </div>

                    <div className={styles.buttonRow} style={{ justifyContent: 'space-between' }}>
                        {isEditMode && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className={styles.cancelButton}
                                style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'מוחק...' : 'מחק'}
                            </button>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginLeft: isEditMode ? 0 : 'auto' }}>
                            <button type="button" onClick={onClose} className={styles.cancelButton}>
                                ביטול
                            </button>
                            <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
                                {isSubmitting ? 'שומר...' : 'שמור'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
