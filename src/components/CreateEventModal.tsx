'use client';

import React, { useState, useEffect } from 'react';
import styles from './CreateEventModal.module.css';
import { CalendarListEntry } from '@/lib/google-calendar';
import { createEventAction, updateEventAction, deleteEventAction } from '@/app/actions';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

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

    // Initialize state when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialEvent) {
                // Edit Mode
                setTitle(initialEvent.summary || '');
                setDescription(initialEvent.description || '');

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

                    // Initial logic: Google sends exclusive end date for all day (e.g. End is 14th, meaning event is 13th).
                    // We want to show Inclusive end date in picker (display 13th).
                    const inclusiveEnd = new Date(endD);
                    inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
                    setEndDate(inclusiveEnd);

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

        const eventData: any = {
            summary: title || '(ללא כותרת)',
            description: description,
        };

        if (isAllDay) {
            // Full Day Event
            eventData.start = { date: format(startDate, 'yyyy-MM-dd') };

            // Exclusive End Date Logic for Submission
            // If user selected 13th, we send 14th.
            const endD = new Date(endDate);
            endD.setDate(endD.getDate() + 1);
            eventData.end = { date: format(endD, 'yyyy-MM-dd') };
        } else {
            // Time Based Event
            // Construct ISO DateTime strings
            // We need to combine the Date object from picker with the Time string.
            const sDate = format(startDate, 'yyyy-MM-dd');
            const eDate = format(endDate, 'yyyy-MM-dd');

            const startDateTime = new Date(`${sDate}T${startTime}:00`);
            const endDateTime = new Date(`${eDate}T${endTime}:00`);

            eventData.start = { dateTime: startDateTime.toISOString() };
            eventData.end = { dateTime: endDateTime.toISOString() };
        }

        if (colorId) {
            eventData.colorId = colorId;
        }

        try {
            let result;
            if (isEditMode) {
                result = await updateEventAction(selectedCalendarId, initialEvent.id, eventData);
            } else {
                result = await createEventAction(selectedCalendarId, eventData);
            }

            if (result.success) {
                onSaveSuccess(result.data);
                onClose();
            } else {
                alert('שגיאה בשמירת האירוע: ' + result.error);
            }
        } catch (err) {
            console.error(err);
            alert('אירעה שגיאה לא צפויה.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('האם אתה בטוח שברצונך למחוק אירוע זה?')) return;

        setIsDeleting(true);
        try {
            const result = await deleteEventAction(selectedCalendarId, initialEvent.id);
            if (result.success) {
                if (onDeleteSuccess) onDeleteSuccess(initialEvent.id);
                onClose();
            } else {
                alert('שגיאה במחיקת האירוע: ' + result.error);
            }
        } catch (err) {
            console.error(err);
            alert('שגיאה במחיקה');
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter out colors to show a reasonable set (colors object has keys like '1', '2'...)
    const colorKeys = eventColors ? Object.keys(eventColors).slice(0, 12) : [];

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()} dir="rtl">
                <h2 className={styles.title}>{isEditMode ? 'עריכת אירוע' : 'יצירת אירוע חדש'}</h2>

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
