import React from 'react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { CalendarEvent } from '@/lib/google-calendar';
import styles from './DayDetailModal.module.css';

interface DayDetailModalProps {
    date: Date;
    events: CalendarEvent[];
    onClose: () => void;
    onCreate?: () => void;
    onEventClick?: (event: CalendarEvent) => void;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({ date, events, onClose, onCreate, onEventClick }) => {
    // Sort events by start time. All-day events first.
    const sortedEvents = [...events].sort((a, b) => {
        const aStart = a.start?.dateTime || a.start?.date || '';
        const bStart = b.start?.dateTime || b.start?.date || '';
        return aStart.localeCompare(bStart);
    });

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{format(date, 'EEEE, dd/MM/yyyy', { locale: he })}</h2>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {onCreate && (
                            <button className={styles.createButton} onClick={onCreate}>
                                + צור אירוע
                            </button>
                        )}
                        <button className={styles.closeButton} onClick={onClose}>×</button>
                    </div>
                </div>

                <div className={styles.eventList}>
                    {sortedEvents.length === 0 ? (
                        <p className={styles.emptyMessage}>אין אירועים ליום זה</p>
                    ) : (
                        sortedEvents.map((event, idx) => {
                            const startTime = event.start?.dateTime ? format(parseISO(event.start.dateTime), 'HH:mm') : null;
                            const endTime = event.end?.dateTime ? format(parseISO(event.end.dateTime), 'HH:mm') : null;
                            const isFullDay = !event.start?.dateTime;

                            return (
                                <div key={event.id} className={styles.eventItem}>
                                    <div className={styles.eventTime}>
                                        {event.start?.dateTime ? format(parseISO(event.start.dateTime), 'HH:mm') : 'כל היום'}
                                    </div>
                                    <div
                                        className={styles.eventDetails}
                                        style={{ cursor: onEventClick ? 'pointer' : 'default' }}
                                        onClick={() => onEventClick && onEventClick(event)}
                                    >
                                        <h3 className={styles.eventSummary}>{event.summary || '(ללא כותרת)'}</h3>
                                        {event.location && (
                                            <div className={styles.eventLocation}>
                                                📍 {event.location}
                                            </div>
                                        )}
                                        {event.description && (
                                            <p className={styles.eventDescription}>{event.description}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default DayDetailModal;
