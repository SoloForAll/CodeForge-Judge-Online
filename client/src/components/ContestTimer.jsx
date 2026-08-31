import React, { useState, useEffect } from 'react';
import { Clock3, Play, CheckCircle2 } from 'lucide-react';

export function ContestTimer({ startsAt, durationMinutes }) {
  const [timeLeft, setTimeLeft] = useState({
    state: 'upcoming', // 'upcoming' | 'running' | 'ended'
    hours: '00',
    minutes: '00',
    seconds: '00'
  });

  useEffect(() => {
    if (!startsAt || !durationMinutes) return;

    const startTime = new Date(startsAt).getTime();
    const endTime = startTime + durationMinutes * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();

      if (now < startTime) {
        // Upcoming
        const diff = Math.max(0, startTime - now);
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({
          state: 'upcoming',
          hours: String(h).padStart(2, '0'),
          minutes: String(m).padStart(2, '0'),
          seconds: String(s).padStart(2, '0')
        });
      } else if (now >= startTime && now < endTime) {
        // Active / Running
        const diff = Math.max(0, endTime - now);
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({
          state: 'running',
          hours: String(h).padStart(2, '0'),
          minutes: String(m).padStart(2, '0'),
          seconds: String(s).padStart(2, '0')
        });
      } else {
        // Ended
        setTimeLeft({
          state: 'ended',
          hours: '00',
          minutes: '00',
          seconds: '00'
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startsAt, durationMinutes]);

  return (
    <div className={`contest-timer-card ${timeLeft.state}`}>
      <div className="timer-badge">
        {timeLeft.state === 'running' ? (
          <span className="live-indicator"><span className="live-dot" /> LIVE CONTEST</span>
        ) : timeLeft.state === 'upcoming' ? (
          <span><Clock3 size={14} /> UPCOMING</span>
        ) : (
          <span><CheckCircle2 size={14} /> CONTEST ENDED</span>
        )}
      </div>

      <div className="timer-display">
        {timeLeft.state === 'ended' ? (
          <div className="timer-ended-text">Contest has concluded. Standings are final.</div>
        ) : (
          <>
            <div className="time-unit">
              <b>{timeLeft.hours}</b>
              <span>Hours</span>
            </div>
            <span className="time-sep">:</span>
            <div className="time-unit">
              <b>{timeLeft.minutes}</b>
              <span>Mins</span>
            </div>
            <span className="time-sep">:</span>
            <div className="time-unit">
              <b>{timeLeft.seconds}</b>
              <span>Secs</span>
            </div>
          </>
        )}
      </div>

      <p className="timer-subtext">
        {timeLeft.state === 'upcoming'
          ? 'Countdown until contest problem set unlocks'
          : timeLeft.state === 'running'
          ? 'Time remaining before submission window closes'
          : 'Problems are now open for open practice'}
      </p>
    </div>
  );
}

