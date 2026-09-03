import React from 'react';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  trackClassName?: string;
  disabled?: boolean;
}

/**
 * Obsidian-style lightweight custom Slider component.
 * Features:
 * - High-contrast Obsidian visual track with white progress fill and inset shadow.
 * - Solid white circular thumb knob with elevation drop shadow.
 * - Overlay transparent native input for complete keyboard (arrows, home, end), touch, and drag accessibility.
 */
export const Slider: React.FC<SliderProps> = React.memo(({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className = '',
  trackClassName = '',
  disabled = false,
  ...props
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dragSessionRef = React.useRef<{
    startScreenX: number;
    startValue: number;
    trackPhysicalWidth: number;
    pointerId: number;
    lastEmitted: number;
  } | null>(null);

  // Clamp value within bounds
  const numericValue = typeof value === 'number' && !isNaN(value) ? value : min;
  const clampedValue = Math.min(max, Math.max(min, numericValue));
  const percentage = max > min ? ((clampedValue - min) / (max - min)) * 100 : 0;
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    try {
      container.setPointerCapture(e.pointerId);
    } catch (err) {}

    const rect = container.getBoundingClientRect();
    const currentTrackWidth = rect.width || 90;

    // Calculate initial value directly from where clicked on the track
    const clickRatio = Math.min(1, Math.max(0, (e.clientX - rect.left) / currentTrackWidth));
    const rawVal = min + clickRatio * (max - min);
    const steps = Math.round((rawVal - min) / step);
    const initialVal = Math.min(max, Math.max(min, min + steps * step));

    onChange(initialVal);

    // Save physical screen drag session (immune to DOM zoom shifts during active hold)
    dragSessionRef.current = {
      startScreenX: e.screenX,
      startValue: initialVal,
      trackPhysicalWidth: currentTrackWidth,
      pointerId: e.pointerId,
      lastEmitted: initialVal,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session) return;

      // Delta in physical screen pixels (does not shift when DOM zoom changes)
      const deltaPhysical = moveEvent.screenX - session.startScreenX;
      const deltaValue = (deltaPhysical / session.trackPhysicalWidth) * (max - min);
      const targetVal = session.startValue + deltaValue;
      const targetSteps = Math.round((targetVal - min) / step);
      const nextClamped = Math.min(max, Math.max(min, min + targetSteps * step));

      if (nextClamped !== session.lastEmitted) {
        session.lastEmitted = nextClamped;
        onChange(nextClamped);
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (container && container.hasPointerCapture(upEvent.pointerId)) {
        try {
          container.releasePointerCapture(upEvent.pointerId);
        } catch (err) {}
      }
      dragSessionRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={`relative inline-flex items-center select-none touch-none outline-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      style={{ height: '20px', minWidth: '90px' }}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={clampedValue}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          onChange(Math.min(max, clampedValue + step));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          onChange(Math.max(min, clampedValue - step));
        } else if (e.key === 'Home') {
          e.preventDefault();
          onChange(min);
        } else if (e.key === 'End') {
          e.preventDefault();
          onChange(max);
        }
      }}
    >
      {/* Background unfilled track */}
      <div
        className={`w-full h-[6px] bg-[var(--flint-border-strong,#333333)] border border-[var(--flint-border-base,#404040)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] rounded-full overflow-hidden relative ${trackClassName}`}
      >
        {/* Filled progress track */}
        <div
          className="h-full bg-white rounded-full pointer-events-none"
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>

      {/* Thumb Knob */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.45),0_1px_2px_rgba(0,0,0,0.25)] pointer-events-none active:scale-105"
        style={{
          left: `calc(${clampedPercentage}% - ${(clampedPercentage / 100) * 16}px)`,
        }}
      />
    </div>
  );
});
