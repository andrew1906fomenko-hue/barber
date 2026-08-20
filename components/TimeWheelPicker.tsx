"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, CaretLeft, CaretRight, CaretUp } from "@phosphor-icons/react";

const ITEM_HEIGHT = 54;
const VISIBLE_ITEMS = 5;
const COMPACT_ITEM_HEIGHT = 34;
const COMPACT_VISIBLE_ITEMS = 3;
const HORIZONTAL_ITEM_WIDTH = 72;
const HORIZONTAL_VISIBLE_ITEMS = 5;

export const defaultTimeWheelOptions = Array.from({ length: 289 }, (_, index) => {
  const minutes = index * 5;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

const clampIndex = (index: number, options: string[]) => Math.min(Math.max(index, 0), Math.max(options.length - 1, 0));

function resolveSelectedIndex(value: string, options: string[]) {
  const exactIndex = options.indexOf(value);
  if (exactIndex >= 0) return exactIndex;

  const [hours, minutes] = value.split(":").map(Number);
  const valueMinutes = (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
  const nearestIndex = options.reduce((bestIndex, option, index) => {
    const [optionHours, optionMinutes] = option.split(":").map(Number);
    const optionTotal = optionHours * 60 + optionMinutes;
    const best = options[bestIndex].split(":").map(Number);
    const bestTotal = best[0] * 60 + best[1];
    return Math.abs(optionTotal - valueMinutes) < Math.abs(bestTotal - valueMinutes) ? index : bestIndex;
  }, 0);

  return clampIndex(nearestIndex, options);
}

export function TimeWheelPicker({
  "aria-label": ariaLabel,
  className = "",
  compact = false,
  disabled = false,
  horizontal = false,
  label,
  onChange,
  options = defaultTimeWheelOptions,
  value,
}: {
  "aria-label"?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  horizontal?: boolean;
  label?: string;
  onChange: (value: string) => void;
  options?: string[];
  value: string;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userScrollRef = useRef(false);
  const normalizedOptions = useMemo(() => (options.length ? options : defaultTimeWheelOptions), [options]);
  const selectedIndex = resolveSelectedIndex(value, normalizedOptions);
  const [visualIndex, setVisualIndex] = useState(selectedIndex);
  const itemSize = horizontal ? HORIZONTAL_ITEM_WIDTH : compact ? COMPACT_ITEM_HEIGHT : ITEM_HEIGHT;
  const visibleItems = horizontal ? HORIZONTAL_VISIBLE_ITEMS : compact ? COMPACT_VISIBLE_ITEMS : VISIBLE_ITEMS;
  const spacerItems = Math.floor(visibleItems / 2);

  useEffect(() => {
    setVisualIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (horizontal) {
      list.scrollTo({ left: selectedIndex * itemSize, behavior: "smooth" });
    } else {
      list.scrollTo({ top: selectedIndex * itemSize, behavior: "smooth" });
    }
  }, [horizontal, itemSize, selectedIndex, normalizedOptions]);

  const selectIndex = (index: number) => {
    const nextValue = normalizedOptions[clampIndex(index, normalizedOptions)];
    if (nextValue && nextValue !== value) onChange(nextValue);
  };

  const handleScroll = () => {
    if (disabled || !userScrollRef.current) return;
    const list = listRef.current;
    if (!list) return;
    const nextIndex = clampIndex(
      horizontal
        ? Math.round((list.scrollLeft + list.clientWidth / 2 - itemSize * spacerItems - itemSize / 2) / itemSize)
        : Math.round(list.scrollTop / itemSize),
      normalizedOptions,
    );
    setVisualIndex(nextIndex);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      selectIndex(nextIndex);
      userScrollRef.current = false;
    }, 80);
  };

  const markUserScroll = () => {
    userScrollRef.current = true;
  };

  return (
    <div className={`time-wheel-field ${compact ? "time-wheel-field-compact" : ""} ${horizontal ? "time-wheel-field-horizontal" : ""} ${className}`}>
      {label && <span className="time-wheel-label">{label}</span>}
      <div className="time-wheel-shell">
        <button
          type="button"
          onClick={() => selectIndex(selectedIndex - 1)}
          className="time-wheel-nudge"
          disabled={disabled || selectedIndex === 0}
          aria-label="Previous time"
        >
          {horizontal ? <CaretLeft weight="bold" aria-hidden="true" /> : <CaretUp weight="bold" aria-hidden="true" />}
        </button>
        <div
          ref={listRef}
          className="time-wheel-list"
          onScroll={handleScroll}
          onPointerDown={markUserScroll}
          onTouchStart={markUserScroll}
          onWheel={markUserScroll}
          role="listbox"
          aria-label={ariaLabel || label || "Time"}
          aria-disabled={disabled}
          style={horizontal ? { height: compact ? COMPACT_ITEM_HEIGHT : ITEM_HEIGHT, width: itemSize * visibleItems } : { height: itemSize * visibleItems }}
        >
          <div style={horizontal ? { width: itemSize * spacerItems, flex: "0 0 auto" } : { height: itemSize * spacerItems }} aria-hidden="true" />
          {normalizedOptions.map((option, index) => {
            const active = index === visualIndex;
            const distance = Math.abs(index - visualIndex);
            return (
              <button
                key={option}
                type="button"
                onClick={() => selectIndex(index)}
                className={`time-wheel-option ${active ? "time-wheel-option-active" : ""}`}
                disabled={disabled}
                role="option"
                aria-selected={active}
                style={horizontal
                  ? { width: itemSize, height: compact ? COMPACT_ITEM_HEIGHT : ITEM_HEIGHT, opacity: active ? 1 : distance === 1 ? 0.62 : 0.34, flex: "0 0 auto", color: active ? "var(--textPrimary)" : undefined }
                  : { height: itemSize, opacity: active ? 1 : distance === 1 ? 0.62 : 0.34, color: active ? "var(--textPrimary)" : undefined }}
              >
                {option}
              </button>
            );
          })}
          <div style={horizontal ? { width: itemSize * spacerItems, flex: "0 0 auto" } : { height: itemSize * spacerItems }} aria-hidden="true" />
        </div>
        <div className="time-wheel-selection" aria-hidden="true" />
        <button
          type="button"
          onClick={() => selectIndex(selectedIndex + 1)}
          className="time-wheel-nudge"
          disabled={disabled || selectedIndex === normalizedOptions.length - 1}
          aria-label="Next time"
        >
          {horizontal ? <CaretRight weight="bold" aria-hidden="true" /> : <CaretDown weight="bold" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

export function TimeRangeWheelPicker({
  className = "",
  compact = false,
  end,
  endLabel = "End time",
  horizontal = false,
  onEndChange,
  onStartChange,
  options,
  start,
  startLabel = "Start time",
}: {
  className?: string;
  compact?: boolean;
  end: string;
  endLabel?: string;
  horizontal?: boolean;
  onEndChange: (value: string) => void;
  onStartChange: (value: string) => void;
  options?: string[];
  start: string;
  startLabel?: string;
}) {
  return (
    <div className={`time-range-wheel ${compact ? "time-range-wheel-compact" : ""} ${className}`}>
      <TimeWheelPicker compact={compact} horizontal={horizontal} label={startLabel} value={start} onChange={onStartChange} options={options} />
      <span className="time-range-separator" aria-hidden="true">-</span>
      <TimeWheelPicker compact={compact} horizontal={horizontal} label={endLabel} value={end} onChange={onEndChange} options={options} />
    </div>
  );
}
