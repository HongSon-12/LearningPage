"use client";
import { DayPicker } from "@daypicker/react";
import { vi } from "@daypicker/react/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SelectField, SelectOption } from "@/components/forms/select-field";
import { Button } from "@/components/ui/button";
import { isoDate } from "@/lib/date-time-input";
export function Calendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  min,
  max,
}: {
  month: Date;
  onMonthChange: (date: Date) => void;
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  min?: Date;
  max?: Date;
}) {
  const minYear = min?.getFullYear() ?? 1900,
    maxYear = max?.getFullYear() ?? 2199;
  return (
    <div className="space-y-3" data-slot="calendar">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          aria-label="Tháng trước"
          disabled={
            month.getFullYear() === minYear &&
            month.getMonth() === (min?.getMonth() ?? 0)
          }
          onClick={() =>
            onMonthChange(
              new Date(month.getFullYear(), month.getMonth() - 1, 1, 12),
            )
          }
        >
          <ChevronLeft />
        </Button>
        <SelectField
          aria-label="Tháng"
          value={String(month.getMonth())}
          onValueChange={(value) =>
            onMonthChange(new Date(month.getFullYear(), Number(value), 1, 12))
          }
          containerClassName="min-w-0 flex-1"
          className="h-9"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <SelectOption
              key={i}
              value={String(i)}
            >{`Tháng ${i + 1}`}</SelectOption>
          ))}
        </SelectField>
        <SelectField
          aria-label="Năm"
          value={String(month.getFullYear())}
          onValueChange={(value) =>
            onMonthChange(new Date(Number(value), month.getMonth(), 1, 12))
          }
          containerClassName="w-22 shrink-0"
          className="h-9"
        >
          {Array.from(
            { length: maxYear - minYear + 1 },
            (_, i) => minYear + i,
          ).map((year) => (
            <SelectOption key={year} value={String(year)}>
              {year}
            </SelectOption>
          ))}
        </SelectField>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          aria-label="Tháng sau"
          disabled={
            month.getFullYear() === maxYear &&
            month.getMonth() === (max?.getMonth() ?? 11)
          }
          onClick={() =>
            onMonthChange(
              new Date(month.getFullYear(), month.getMonth() + 1, 1, 12),
            )
          }
        >
          <ChevronRight />
        </Button>
      </div>
      <DayPicker
        mode="single"
        locale={vi}
        weekStartsOn={1}
        showOutsideDays
        month={month}
        onMonthChange={onMonthChange}
        selected={selected}
        onSelect={onSelect}
        hideNavigation
        startMonth={new Date(minYear, 0, 1)}
        endMonth={new Date(maxYear, 11, 1)}
        disabled={[
          ...(min ? [{ before: min }] : []),
          ...(max ? [{ after: max }] : []),
        ]}
        labels={{ labelDayButton: (date) => `Ngày ${displayDay(date)}` }}
        classNames={{
          root: "w-full",
          months: "w-full",
          month: "w-full space-y-1",
          month_caption: "sr-only",
          month_grid: "w-full table-fixed border-collapse",
          weekdays: "",
          weekday: "h-8 text-center text-xs font-normal text-muted-foreground",
          week: "",
          day: "h-10 p-0 text-center text-sm",
          day_button:
            "mx-auto flex size-9 items-center justify-center rounded-md outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
          selected:
            "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
          today:
            "[&>button]:font-bold [&>button]:underline [&>button]:underline-offset-4",
          outside: "text-muted-foreground/50",
          disabled: "pointer-events-none opacity-30",
          hidden: "invisible",
        }}
      />
    </div>
  );
}
function displayDay(date: Date) {
  return isoDate(date).split("-").reverse().join("/");
}
