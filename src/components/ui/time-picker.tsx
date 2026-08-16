import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface TimePickerProps {
  /** Selected time as a 24-hour "HH:mm" string, or "" when unset. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

/**
 * A themed 24-hour time picker: tapping the field opens an inline panel with two
 * scrollable hour/minute columns. Emits a "HH:mm" string.
 *
 * The panel is rendered inline (NOT in a portal) on purpose: when this lives
 * inside a Radix Dialog, the Dialog's scroll-lock (react-remove-scroll) blocks
 * touch-drag scrolling on any portaled layer rendered outside its subtree. An
 * inline panel stays within that subtree, so finger-scrolling the columns works
 * on mobile.
 */
export function TimePicker({
  value,
  onChange,
  placeholder = "--:--",
  id,
  className,
  disabled,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedHour, selectedMinute] = value ? value.split(":") : ["", ""];

  const containerRef = React.useRef<HTMLDivElement>(null);
  const hourRef = React.useRef<HTMLButtonElement>(null);
  const minuteRef = React.useRef<HTMLButtonElement>(null);

  // Bring the current selection into view each time the panel opens.
  React.useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      hourRef.current?.scrollIntoView({ block: "center" });
      minuteRef.current?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Close when tapping/clicking outside the picker.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const setHour = (h: string) => onChange(`${h}:${selectedMinute || "00"}`);
  const setMinute = (m: string) => onChange(`${selectedHour || "00"}:${m}`);

  const column = (
    values: string[],
    selected: string,
    onPick: (v: string) => void,
    selectedRef: React.RefObject<HTMLButtonElement>,
  ) => (
    // Native overflow scrolling: `touch-action: pan-y` keeps a vertical finger
    // drag as a scroll (not a tap), and `overscroll-contain` stops it from
    // bubbling out to the dialog once the column reaches its end.
    <div
      className="h-52 w-16 overflow-y-auto overscroll-contain rounded-md [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1"
      style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
    >
      <div className="flex flex-col gap-0.5">
        {values.map((v) => {
          const isSelected = v === selected;
          return (
            <Button
              key={v}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              variant={isSelected ? "default" : "ghost"}
              size="sm"
              className="h-9 w-full shrink-0 justify-center tabular-nums transition-transform active:scale-95"
              onClick={() => onPick(v)}
            >
              {v}
            </Button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full justify-start text-left font-normal tabular-nums transition-transform active:scale-[0.99]",
          !value && "text-muted-foreground",
        )}
      >
        {value || placeholder}
        <Clock className="ml-auto h-4 w-4 opacity-50" />
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
          <div className="flex items-stretch gap-1">
            {column(HOURS, selectedHour, setHour, hourRef)}
            <div className="flex items-center text-lg font-medium text-muted-foreground">
              :
            </div>
            {column(MINUTES, selectedMinute, setMinute, minuteRef)}
          </div>
        </div>
      )}
    </div>
  );
}
