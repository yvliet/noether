import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { EyedropperIcon, ChevronsUpDownIcon } from '@/components/common/Icons';
import { useSettingsStore } from '@/store/settingsStore';

export interface HsvColor {
  h: number; // 0 - 360
  s: number; // 0 - 100
  v: number; // 0 - 100
}

export interface RgbColor {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

// Convert HEX string to RGB
export function hexToRgb(hex: string): RgbColor {
  let clean = hex.replace(/^#/, '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) {
    return { r: 234, g: 88, b: 12 }; // Default orange
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { r: 234, g: 88, b: 12 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Convert RGB to HEX
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert RGB to HSV
export function rgbToHsv(r: number, g: number, b: number): HsvColor {
  r = Math.max(0, Math.min(255, r)) / 255;
  g = Math.max(0, Math.min(255, g)) / 255;
  b = Math.max(0, Math.min(255, b)) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = h * 60;
  }

  return {
    h: Math.round(h),
    s: Math.round(s),
    v: Math.round(v),
  };
}

// Convert HSV to RGB
export function hsvToRgb(h: number, s: number, v: number): RgbColor {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  v = Math.max(0, Math.min(100, v)) / 100;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

export function hexToHsv(hex: string): HsvColor {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

export interface ColorPreset {
  name?: string;
  color: string;
}

export interface InlineColorPickerProps {
  value: string; // HEX color string
  onChange: (color: string) => void;
  presets?: (ColorPreset | string)[];
  className?: string;
}

/**
 * Pure inline color picker with 2D spectrum, hue slider, eyedropper, RGB/HEX inputs, and presets.
 */
export const InlineColorPicker: React.FC<InlineColorPickerProps> = React.memo(({
  value,
  onChange,
  presets,
  className = '',
}) => {
  const globalHistory = useSettingsStore((s) => s.colorHistory);
  const addColorHistory = useSettingsStore((s) => s.addColorHistory);

  const [format, setFormat] = useState<'rgb' | 'hex'>('rgb');
  const [tempHexInput, setTempHexInput] = useState(value);
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(value));

  const spectrumRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHsv(hexToHsv(value));
    setTempHexInput(value);
  }, [value]);

  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

  const updateColor = useCallback(
    (newHsv: HsvColor) => {
      setHsv(newHsv);
      const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
      setTempHexInput(newHex);
      onChange(newHex);
    },
    [onChange]
  );

  // Spectrum 2D Drag Handling
  const handleSpectrumMove = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      if (!spectrumRef.current) return;
      const rect = spectrumRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      const s = Math.round((x / rect.width) * 100);
      const v = Math.round((1 - y / rect.height) * 100);

      updateColor({ ...hsv, s, v });
    },
    [hsv, updateColor]
  );

  const handleSpectrumPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    handleSpectrumMove(e);

    let rafId: number | null = null;
    let latestEvent: PointerEvent | null = null;

    const onPointerMove = (moveEvent: PointerEvent) => {
      latestEvent = moveEvent;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (latestEvent) {
            handleSpectrumMove(latestEvent);
          }
        });
      }
    };

    const onPointerUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      addColorHistory(hex);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Hue Slider Drag Handling
  const handleHueMove = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      if (!hueSliderRef.current) return;
      const rect = hueSliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const h = Math.round((x / rect.width) * 360) % 360;

      updateColor({ ...hsv, h });
    },
    [hsv, updateColor]
  );

  const handleHuePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    handleHueMove(e);

    let rafId: number | null = null;
    let latestEvent: PointerEvent | null = null;

    const onPointerMove = (moveEvent: PointerEvent) => {
      latestEvent = moveEvent;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (latestEvent) {
            handleHueMove(latestEvent);
          }
        });
      }
    };

    const onPointerUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      addColorHistory(hex);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Eyedropper API Tool
  const handleEyeDropper = async () => {
    if (typeof (window as any).EyeDropper === 'function') {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          const newHsv = hexToHsv(result.sRGBHex);
          updateColor(newHsv);
          addColorHistory(result.sRGBHex);
        }
      } catch (err) {
        // User cancelled
      }
    }
  };

  // Direct RGB Input Handlers
  const handleRgbChange = (channel: 'r' | 'g' | 'b', valStr: string) => {
    const num = parseInt(valStr, 10);
    const clamped = isNaN(num) ? 0 : Math.max(0, Math.min(255, num));
    const newRgb = { ...rgb, [channel]: clamped };
    const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
    updateColor(nextHsv(newHsv));
  };

  const nextHsv = (hsvVal: HsvColor) => hsvVal;

  // Direct HEX Input Handlers
  const handleHexChange = (hexStr: string) => {
    setTempHexInput(hexStr);
    const clean = hexStr.trim();
    if (/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(clean)) {
      const formatted = clean.startsWith('#') ? clean : `#${clean}`;
      const newHsv = hexToHsv(formatted);
      setHsv(newHsv);
      onChange(formatted);
      addColorHistory(formatted);
    }
  };

  const swatches = presets && presets.length > 0 ? presets : globalHistory;

  return (
    <div
      data-flint-colorpicker="true"
      className={`w-[220px] bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-lg shadow-[var(--flint-shadow-2)] overflow-hidden select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Saturation / Value 2D Box */}
      <div
        ref={spectrumRef}
        onPointerDown={handleSpectrumPointerDown}
        className="relative w-full h-[125px] cursor-crosshair overflow-hidden touch-none"
        style={{
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
        }}
      >
        {/* White overlay (left to right) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, #ffffff, rgba(255, 255, 255, 0))',
          }}
        />
        {/* Black overlay (bottom to top) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, #000000, rgba(0, 0, 0, 0))',
          }}
        />
        {/* 2D Handle Ring */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.65)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
          }}
        />
      </div>

      {/* 2. Controls Section */}
      <div className="p-2.5 flex flex-col gap-2">
        {/* Eyedropper, Swatch, and Hue Slider */}
        <div className="flex items-center gap-2">
          {/* Eyedropper Tool */}
          <button
            type="button"
            onClick={handleEyeDropper}
            title="Pick color from screen"
            className="p-1 rounded-[4px] text-[#888] hover:text-white hover:bg-[#333333] transition-colors cursor-pointer shrink-0"
          >
            <EyedropperIcon size={15} />
          </button>

          {/* Large Current Color Circle */}
          <div
            className="w-6 h-6 rounded-full border border-black/20 shadow-[0_1px_2px_rgba(0,0,0,0.35)] shrink-0"
            style={{ backgroundColor: hex }}
          />

          {/* Hue Rainbow Slider Track */}
          <div
            ref={hueSliderRef}
            onPointerDown={handleHuePointerDown}
            className="relative flex-1 h-[10px] rounded-full cursor-pointer touch-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]"
            style={{
              background:
                'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
            }}
          >
            {/* Hue Knob */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.65)] -translate-x-1/2 pointer-events-none"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
                backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
              }}
            />
          </div>
        </div>

        {/* 3. Inputs & Format Switcher */}
        {format === 'rgb' ? (
          <div className="flex items-center gap-1.5 pt-0.5">
            {/* R */}
            <div className="flex flex-col items-center flex-1">
              <input
                type="number"
                min={0}
                max={255}
                value={rgb.r}
                onChange={(e) => handleRgbChange('r', e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#383838] focus:border-[#555] rounded-[4px] py-0.5 text-center text-xs text-white outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] font-normal transition-colors"
              />
              <span className="text-[9px] text-[#888] mt-0.5 font-normal">R</span>
            </div>

            {/* G */}
            <div className="flex flex-col items-center flex-1">
              <input
                type="number"
                min={0}
                max={255}
                value={rgb.g}
                onChange={(e) => handleRgbChange('g', e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#383838] focus:border-[#555] rounded-[4px] py-0.5 text-center text-xs text-white outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] font-normal transition-colors"
              />
              <span className="text-[9px] text-[#888] mt-0.5 font-normal">G</span>
            </div>

            {/* B */}
            <div className="flex flex-col items-center flex-1">
              <input
                type="number"
                min={0}
                max={255}
                value={rgb.b}
                onChange={(e) => handleRgbChange('b', e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#383838] focus:border-[#555] rounded-[4px] py-0.5 text-center text-xs text-white outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] font-normal transition-colors"
              />
              <span className="text-[9px] text-[#888] mt-0.5 font-normal">B</span>
            </div>

            {/* Switch to HEX */}
            <button
              type="button"
              onClick={() => setFormat('hex')}
              title="Switch to HEX format"
              className="p-1 mb-2.5 text-[#777] hover:text-white hover:bg-[#333] rounded-[4px] transition-colors cursor-pointer shrink-0"
            >
              <ChevronsUpDownIcon size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pt-0.5">
            {/* HEX */}
            <div className="flex flex-col items-center flex-1">
              <input
                type="text"
                value={tempHexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#383838] focus:border-[#555] rounded-[4px] py-0.5 text-center text-xs text-white outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] font-normal uppercase transition-colors"
              />
              <span className="text-[9px] text-[#888] mt-0.5 font-normal">HEX</span>
            </div>

            {/* Switch to RGB */}
            <button
              type="button"
              onClick={() => setFormat('rgb')}
              title="Switch to RGB format"
              className="p-1 mb-2.5 text-[#777] hover:text-white hover:bg-[#333] rounded-[4px] transition-colors cursor-pointer shrink-0"
            >
              <ChevronsUpDownIcon size={13} />
            </button>
          </div>
        )}

        {/* 4. Color History Swatches */}
        {swatches && swatches.length > 0 && (
          <div className="pt-2 border-t border-[#383838]">
            <div className="flex items-center gap-1.5 flex-wrap">
              {swatches.map((p, idx) => {
                const presetColor = typeof p === 'string' ? p : p.color;
                const presetName = typeof p === 'string' ? p : p.name || p.color;
                const isSelected = hex.toLowerCase() === presetColor.toLowerCase();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newHsv = hexToHsv(presetColor);
                      updateColor(newHsv);
                      addColorHistory(presetColor);
                    }}
                    className={`w-4 h-4 rounded-full border cursor-pointer transition-transform hover:scale-120 active:scale-95 flex items-center justify-center p-0 ${
                      isSelected ? 'border-white ring-1 ring-white/70 scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: presetColor }}
                    title={presetName}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export interface ColorPickerProps {
  value: string; // HEX color string, e.g. '#ea580c'
  onChange: (color: string) => void;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  presets?: (ColorPreset | string)[];
}

export const ColorPicker: React.FC<ColorPickerProps> = React.memo(({
  value,
  onChange,
  className = '',
  triggerClassName = '',
  disabled = false,
  presets,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const popoverHeight = presets && presets.length > 0 ? 300 : 255;
    const popoverWidth = 230;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top: number | undefined;
    let bottom: number | undefined;

    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
      bottom = viewportHeight - rect.top + 6;
    } else {
      top = rect.bottom + 6;
    }

    let right: number | undefined = Math.max(8, viewportWidth - rect.right);
    let left: number | undefined = undefined;

    if (rect.right - popoverWidth < 8) {
      right = undefined;
      left = Math.max(8, rect.left);
    }

    setPopoverPosition({ top, bottom, left, right });
  }, [presets]);

  // Close on outside click or Escape & update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Swatch Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={
          triggerClassName ||
          'w-5 h-5 rounded-full border border-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer transition-transform hover:scale-105 active:scale-95 flex items-center justify-center p-0 outline-none'
        }
        style={{ backgroundColor: value }}
        title={`Color: ${value}`}
        aria-label="Pick color"
      />

      {/* Obsidian Popover Window via Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            data-flint-colorpicker="true"
            style={{
              position: 'fixed',
              top: popoverPosition.top !== undefined ? `${popoverPosition.top}px` : undefined,
              bottom: popoverPosition.bottom !== undefined ? `${popoverPosition.bottom}px` : undefined,
              left: popoverPosition.left !== undefined ? `${popoverPosition.left}px` : undefined,
              right: popoverPosition.right !== undefined ? `${popoverPosition.right}px` : undefined,
              zIndex: 100001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <InlineColorPicker value={value} onChange={onChange} presets={presets} />
          </div>,
          document.body
        )}
    </div>
  );
});
