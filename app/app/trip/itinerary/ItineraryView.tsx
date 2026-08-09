'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ScheduleItem } from '@/lib/app/data';
import Icon from '../icons';

type LegacyDay = { label: string; title: string; description: string };

function dayLabel(iso: string, today: string) {
  if (iso === today) return 'Today';
  const d = new Date(iso + 'T00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function ItineraryView({
  schedule,
  legacyItinerary,
}: {
  schedule: ScheduleItem[];
  legacyItinerary: LegacyDay[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const dates = useMemo(() => Array.from(new Set(schedule.map((s) => s.date))), [schedule]);
  const [selected, setSelected] = useState(() => (dates.includes(today) ? today : dates[0] ?? today));
  const [reminders, setReminders] = useState<'off' | 'on' | 'denied'>('off');
  const timersRef = useRef<number[]>([]);

  const dayItems = schedule.filter((s) => s.date === selected);

  // 15-minute warnings: local notifications while the app is open.
  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  async function enableReminders() {
    if (typeof Notification === 'undefined') {
      setReminders('denied');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setReminders('denied');
      return;
    }
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const now = Date.now();
    for (const item of schedule) {
      const start = new Date(`${item.date}T${item.startTime}:00`).getTime();
      const fireAt = start - 15 * 60 * 1000;
      if (fireAt <= now) continue;
      const id = window.setTimeout(() => {
        new Notification(`Starting in 15 minutes: ${item.title}`, {
          body: item.meetingPlace
            ? `Meet at ${item.meetingPlace}${item.meetingTime ? ` at ${item.meetingTime}` : ''}`
            : `Starts at ${item.startTime}`,
          icon: '/images/app-icon-192.png',
        });
      }, fireAt - now);
      timersRef.current.push(id);
    }
    setReminders('on');
  }

  if (schedule.length === 0) {
    return (
      <div>
        <h1 className="papp-page-title">Itinerary</h1>
        {legacyItinerary.length > 0 ? (
          <section className="papp-card">
            {legacyItinerary.map((day, i) => (
              <div className="papp-day" key={i}>
                <div className="papp-day-label">{day.label}</div>
                <div>
                  {day.title && <h3>{day.title}</h3>}
                  <p>{day.description}</p>
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className="papp-card">
            <p className="papp-empty">Your day-by-day schedule will appear here before departure.</p>
          </section>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="papp-page-head">
        <h1 className="papp-page-title">Itinerary</h1>
        {reminders !== 'on' ? (
          <button className="papp-remind" onClick={enableReminders}>
            🔔 15-min alerts
          </button>
        ) : (
          <span className="papp-remind on">🔔 Alerts on</span>
        )}
      </div>
      {reminders === 'denied' && (
        <p className="papp-note">
          Notifications are blocked in this browser — allow them in settings to get 15-minute warnings.
        </p>
      )}

      <div className="papp-daypills">
        {dates.map((d, i) => (
          <button
            key={d}
            className={`papp-daypill${d === selected ? ' active' : ''}`}
            onClick={() => setSelected(d)}
          >
            <span>Day {i + 1}</span>
            {dayLabel(d, today)}
          </button>
        ))}
      </div>

      <div className="papp-timeline">
        {dayItems.map((item) => (
          <div className="papp-slot" key={item.id}>
            <div className="papp-slot-time">{item.startTime}</div>
            <div className="papp-slot-body">
              <h3>{item.title}</h3>
              {(item.meetingPlace || item.meetingTime) && (
                <p className="papp-meet">
                  <Icon name="pin" size={15} /> Meet
                  {item.meetingPlace ? ` at ${item.meetingPlace}` : ''}
                  {item.meetingTime ? ` — ${item.meetingTime}` : ''}
                </p>
              )}
              {item.description && <p>{item.description}</p>}
              {item.educationalContent && (
                <details className="papp-learn">
                  <summary>
                    <Icon name="learning" size={15} /> Learning moment
                  </summary>
                  <p>{item.educationalContent}</p>
                </details>
              )}
            </div>
          </div>
        ))}
        {dayItems.length === 0 && <p className="papp-empty">Nothing scheduled this day yet.</p>}
      </div>
    </div>
  );
}
