import React, { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ScrollableTimePickerProps {
  value: string; // "HH:mm" format
  onChange: (time: string) => void;
  label?: string;
  className?: string;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

// Generate arrays for hours (00-23) and minutes (00-59)
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

interface WheelColumnProps {
  items: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  label: string;
}

function WheelColumn({ items, selectedValue, onSelect, label }: WheelColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Scroll to selected value on mount and when value changes externally
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scrollable-time-picker.tsx:useEffect',message:'Mount/value change',data:{label,selectedValue,hasRef:!!scrollRef.current,scrollHeight:scrollRef.current?.scrollHeight,clientHeight:scrollRef.current?.clientHeight},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    if (scrollRef.current && !isScrollingRef.current) {
      const index = items.indexOf(selectedValue);
      if (index !== -1) {
        const scrollTop = index * ITEM_HEIGHT;
        scrollRef.current.scrollTop = scrollTop;
      }
    }
  }, [selectedValue, items]);

  const handleScroll = useCallback(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scrollable-time-picker.tsx:handleScroll',message:'Scroll event fired',data:{label,hasRef:!!scrollRef.current,scrollTop:scrollRef.current?.scrollTop},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    if (!scrollRef.current) return;

    isScrollingRef.current = true;

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Debounce the selection update
    scrollTimeoutRef.current = setTimeout(() => {
      if (!scrollRef.current) return;

      const scrollTop = scrollRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      const newValue = items[clampedIndex];

      if (newValue !== selectedValue) {
        onSelect(newValue);
      }

      // Snap to the closest item
      scrollRef.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: 'smooth',
      });

      isScrollingRef.current = false;
    }, 100);
  }, [items, selectedValue, onSelect]);

  const handleItemClick = useCallback((value: string) => {
    const index = items.indexOf(value);
    if (index !== -1 && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: 'smooth',
      });
      onSelect(value);
    }
  }, [items, onSelect]);

  // Calculate padding to center items
  const paddingItems = Math.floor(VISIBLE_ITEMS / 2);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scrollable-time-picker.tsx:WheelColumn:render',message:'Component rendered',data:{label,containerHeight:ITEM_HEIGHT*VISIBLE_ITEMS,itemHeight:ITEM_HEIGHT,visibleItems:VISIBLE_ITEMS,totalItems:items.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  }, [label, items.length]);
  // #endregion

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-gray-500 mb-1">{label}</span>
      {/* Simple scrollable container */}
      <div
        ref={scrollRef}
        className="w-16 overflow-y-auto scrollbar-hide border border-gray-200 rounded bg-gray-50"
        onScroll={handleScroll}
        style={{
          height: ITEM_HEIGHT * VISIBLE_ITEMS,
        }}
      >
        {/* Top padding */}
        <div style={{ height: paddingItems * ITEM_HEIGHT }} />
        
        {/* Items */}
        {items.map((item) => (
          <div
            key={item}
            onClick={() => handleItemClick(item)}
            className={cn(
              'flex items-center justify-center cursor-pointer transition-all duration-150',
              item === selectedValue
                ? 'text-[#F15929] font-semibold text-lg bg-orange-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            )}
            style={{
              height: ITEM_HEIGHT,
            }}
          >
            {item}
          </div>
        ))}
        
        {/* Bottom padding */}
        <div style={{ height: paddingItems * ITEM_HEIGHT }} />
      </div>
    </div>
  );
}

export function ScrollableTimePicker({
  value,
  onChange,
  label,
  className,
}: ScrollableTimePickerProps) {
  // Parse current value
  const [hours, minutes] = value ? value.split(':') : ['12', '00'];

  const handleHourChange = useCallback((newHour: string) => {
    onChange(`${newHour}:${minutes}`);
  }, [minutes, onChange]);

  const handleMinuteChange = useCallback((newMinute: string) => {
    onChange(`${hours}:${newMinute}`);
  }, [hours, onChange]);

  // Total height: labels (20px) + wheel (200px) = 220px + padding
  const containerHeight = ITEM_HEIGHT * VISIBLE_ITEMS + 20; // 20px for label

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div 
        className="flex items-start justify-center gap-4 p-4 bg-white border border-gray-200 rounded-lg"
        style={{ height: containerHeight + 32 }} // +32 for padding
      >
        <WheelColumn
          items={HOURS}
          selectedValue={hours || '12'}
          onSelect={handleHourChange}
          label="Hour"
        />
        
        <div 
          className="flex items-center justify-center"
          style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS, marginTop: 20 }} // 20px offset for label
        >
          <span className="text-2xl font-bold text-gray-400">:</span>
        </div>
        
        <WheelColumn
          items={MINUTES}
          selectedValue={minutes || '00'}
          onSelect={handleMinuteChange}
          label="Minute"
        />
      </div>
      <p className="text-xs text-gray-500 text-center">
        Scroll to select time
      </p>
    </div>
  );
}

export default ScrollableTimePicker;
