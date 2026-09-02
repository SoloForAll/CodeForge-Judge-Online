import React, { useState, useEffect, useRef, useCallback } from 'react';

export function SplitPaneHorizontal({
  left,
  right,
  initialRatio = 45,
  minRatio = 25,
  maxRatio = 75,
  storageKey = 'codeforge_h_ratio',
  className = ''
}) {
  const [ratio, setRatio] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const num = Number(saved);
      if (saved && !isNaN(num) && num >= minRatio && num <= maxRatio) {
        return num;
      }
      return initialRatio;
    } catch {
      return initialRatio;
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDoubleClick = () => {
    setRatio(initialRatio || 45);
    localStorage.setItem(storageKey, String(initialRatio || 45));
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      if (currentX === undefined || currentX === null) return;

      const newRatio = ((currentX - rect.left) / rect.width) * 100;
      const clamped = Math.min(Math.max(newRatio, minRatio), maxRatio);
      setRatio(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem(storageKey, String(Math.round(ratio)));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, minRatio, maxRatio, ratio, storageKey]);

  return (
    <div
      ref={containerRef}
      className={`split-container-h ${isDragging ? 'is-resizing' : ''} ${className}`}
    >
      <div className="split-pane-left" style={{ flexBasis: `${ratio}%`, width: `${ratio}%` }}>
        {left}
      </div>

      <div
        className="split-gutter-h"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
        title="Drag to resize pane (Double-click to reset)"
      >
        <div className="gutter-handle-h" />
      </div>

      <div className="split-pane-right" style={{ flexBasis: `${100 - ratio}%`, width: `${100 - ratio}%` }}>
        {right}
      </div>
    </div>
  );
}

export function SplitPaneVertical({
  top,
  bottom,
  initialRatio = 58,
  minRatio = 25,
  maxRatio = 80,
  storageKey = 'codeforge_v_ratio',
  className = ''
}) {
  const [ratio, setRatio] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const num = Number(saved);
      if (saved && !isNaN(num) && num >= minRatio && num <= maxRatio) {
        return num;
      }
      return initialRatio;
    } catch {
      return initialRatio;
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDoubleClick = () => {
    setRatio(initialRatio || 58);
    localStorage.setItem(storageKey, String(initialRatio || 58));
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
      if (currentY === undefined || currentY === null) return;

      const newRatio = ((currentY - rect.top) / rect.height) * 100;
      const clamped = Math.min(Math.max(newRatio, minRatio), maxRatio);
      setRatio(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem(storageKey, String(Math.round(ratio)));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, minRatio, maxRatio, ratio, storageKey]);

  return (
    <div
      ref={containerRef}
      className={`split-container-v ${isDragging ? 'is-resizing' : ''} ${className}`}
    >
      <div className="split-pane-top" style={{ flexBasis: `${ratio}%`, height: `${ratio}%` }}>
        {top}
      </div>

      <div
        className="split-gutter-v"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
        title="Drag to resize height (Double-click to reset)"
      >
        <div className="gutter-handle-v" />
      </div>

      <div className="split-pane-bottom" style={{ flexBasis: `${100 - ratio}%`, height: `${100 - ratio}%` }}>
        {bottom}
      </div>
    </div>
  );
}
