import React, { useMemo, useState } from 'react';

export function SubmissionHeatmap({ activity = [] }) {
  const [tooltip, setTooltip] = useState(null);

  // Map activity by YYYY-MM-DD
  const activityMap = useMemo(() => {
    const map = new Map();
    for (const item of activity) {
      map.set(item.date, Number(item.count));
    }
    return map;
  }, [activity]);

  // Generate 52 weeks (364 days) ending today
  const { weeks, totalSubmissions, activeDays } = useMemo(() => {
    const today = new Date();
    const days = [];
    let total = 0;
    let active = 0;

    // 52 weeks = 364 days
    for (let i = 363; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = activityMap.get(dateStr) || 0;
      total += count;
      if (count > 0) active++;

      days.push({
        date: dateStr,
        dayOfWeek: d.getDay(),
        dateObj: d,
        count
      });
    }

    // Chunk into 7-day columns (weeks)
    const weekCols = [];
    let currentWeek = [];
    for (const day of days) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weekCols.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      weekCols.push(currentWeek);
    }

    return { weeks: weekCols, totalSubmissions: total, activeDays: active };
  }, [activityMap]);

  const getColorClass = (count) => {
    if (count === 0) return 'heat-0';
    if (count === 1) return 'heat-1';
    if (count <= 3) return 'heat-2';
    return 'heat-3';
  };

  return (
    <div className="heatmap-card">
      <div className="heatmap-header">
        <div>
          <h3>Submission Activity</h3>
          <p className="muted">
            <b>{totalSubmissions}</b> submissions in the last year · <b>{activeDays}</b> active days
          </p>
        </div>

        <div className="heatmap-legend">
          <span>Less</span>
          <div className="heat-box heat-0" />
          <div className="heat-box heat-1" />
          <div className="heat-box heat-2" />
          <div className="heat-box heat-3" />
          <span>More</span>
        </div>
      </div>

      <div className="heatmap-grid-scroll">
        <div className="heatmap-grid">
          {weeks.map((week, wIdx) => (
            <div className="heatmap-col" key={wIdx}>
              {week.map((day) => (
                <div
                  key={day.date}
                  className={`heat-cell ${getColorClass(day.count)}`}
                  onMouseEnter={(e) => {
                    const rect = e.target.getBoundingClientRect();
                    setTooltip({
                      text: `${day.count} submission${day.count === 1 ? '' : 's'} on ${new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
                      x: rect.left + rect.width / 2,
                      y: rect.top - 8
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

