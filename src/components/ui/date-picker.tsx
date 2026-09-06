import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

export interface DatePickerProps {
  /** Selected date as a "YYYY-MM-DD" string, or "" when unset. */
  value: string;
  onChange: (value: string) => void;
  /** Return true for days that cannot be picked. */
  disabledDate?: (date: Date) => boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
}

// "YYYY-MM-DD" <-> Date using local date parts (never Date's UTC parsing) so the
// day the user picks is the day that gets stored, regardless of timezone.
export const parseDateString = (s: string): Date | undefined => {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};

export const formatDateString = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * A date field: tapping it opens an inline calendar panel.
 *
 * The panel is rendered inline (NOT in a Popover/portal) on purpose, for the
 * same reason as TimePicker: when this lives inside a Radix Dialog, a portaled
 * layer rendered outside the Dialog's subtree is at the mercy of the Dialog's
 * focus trap and scroll-lock, and taps on it can be swallowed instead of
 * selecting a day. An inline panel stays within the Dialog subtree.
 */
export function DatePicker({
  value,
  onChange,
  disabledDate,
  placeholder = "Pick a date",
  id,
  className,
  disabled,
  invalid,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const selected = parseDateString(value);

  // Bring the panel into view when it opens inside a scrollable dialog.
  React.useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ block: "nearest" });
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

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        aria-expanded={open}
        aria-invalid={invalid}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full justify-start text-left font-normal transition-transform active:scale-[0.99]",
          !value && "text-muted-foreground",
          invalid && "border-destructive",
        )}
      >
        <span>{selected ? format(selected, "PPP") : placeholder}</span>
        <CalendarIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(formatDateString(date));
              setOpen(false);
            }}
            disabled={disabledDate}
          />
        </div>
      )}
    </div>
  );
}
