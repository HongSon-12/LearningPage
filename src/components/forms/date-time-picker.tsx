"use client";
import { useEffect, useId, useRef, useState, type ComponentProps } from "react";
import { CalendarDays, Clock3, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { SelectField, SelectOption } from "./select-field";
import { cn } from "@/lib/utils";
import {
  normalizeDateDraft,
  displayDateTime,
  parseDisplay,
  parseIsoDate,
  isoDate,
  type DateTimeMode,
} from "@/lib/date-time-input";
type Props = Omit<
  ComponentProps<typeof Input>,
  "type" | "value" | "defaultValue" | "onChange" | "min" | "max"
> & {
  mode?: DateTimeMode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  calendarLabel?: string;
  min?: string;
  max?: string;
};
export function DateTimePicker({
  mode = "date",
  value,
  defaultValue = "",
  onValueChange,
  calendarLabel = "",
  name,
  id,
  disabled,
  className,
  required,
  onBlur,
  ref,
  min,
  max,
  ...props
}: Props) {
  const [internal, setInternal] = useState(defaultValue);
  const canonical = value ?? internal;
  const [draft, setDraft] = useState({
    committed: canonical,
    text: displayDateTime(canonical, mode),
  });
  if (draft.committed !== canonical)
    setDraft({ committed: canonical, text: displayDateTime(canonical, mode) });
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"date" | "time">("date");
  const [month, setMonth] = useState(
    () => parseIsoDate(canonical.slice(0, 10)) || new Date(),
  );
  const input = useRef<HTMLInputElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const inputId = id || name || errorId + "-input";
  const parsed = parseDisplay(draft.text, mode);
  const invalid =
    parsed === null ||
    Boolean(parsed && ((min && parsed < min) || (max && parsed > max)));
  const error = invalid
    ? `Nhập ${mode === "time" ? "giờ hợp lệ (HH:mm)" : mode === "date" ? "ngày hợp lệ (dd/mm/yyyy)" : "ngày và giờ hợp lệ (dd/mm/yyyy HH:mm)"}${min || max ? " trong phạm vi cho phép" : ""}.`
    : "";
  useEffect(() => {
    input.current?.setCustomValidity(error);
  }, [error]);
  useEffect(() => {
    const form = hidden.current?.form;
    if (!form || value !== undefined) return;
    const reset = () => {
      setInternal(defaultValue);
      setDraft({
        committed: defaultValue,
        text: displayDateTime(defaultValue, mode),
      });
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [defaultValue, mode, value]);
  function commit(next: string, text = displayDateTime(next, mode)) {
    setDraft({ committed: next, text });
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }
  const selected = parseIsoDate(canonical.slice(0, 10));
  const time = mode === "time" ? canonical : canonical.split("T")[1] || "";
  const [hour, minute] = (time || "00:00").split(":");
  useEffect(() => {
    if (open && mode === "datetime-local" && panel === "time")
      document
        .getElementById(`${inputId}-hours`)
        ?.focus({ preventScroll: true });
  }, [open, mode, panel, inputId]);
  function chooseTime(next: string) {
    commit(
      mode === "time"
        ? next
        : `${selected ? isoDate(selected) : isoDate(month)}T${next}`,
    );
  }
  return (
    <div className="ui-control min-w-0" data-slot="date-time-picker">
      <div className="relative flex min-w-0 items-center">
        <Input
          {...props}
          ref={(node) => {
            input.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          id={inputId}
          value={draft.text}
          type="text"
          inputMode={mode === "date" ? "numeric" : "text"}
          placeholder={
            mode === "date"
              ? "dd/mm/yyyy"
              : mode === "time"
                ? "HH:mm"
                : "dd/mm/yyyy HH:mm"
          }
          disabled={disabled}
          required={required}
          aria-invalid={invalid || props["aria-invalid"]}
          aria-describedby={
            [props["aria-describedby"], invalid ? errorId : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onBlur={onBlur}
          className={cn("pr-18 tabular-nums", className)}
          onChange={(event) => {
            const text = normalizeDateDraft(event.target.value, mode);
            const next = parseDisplay(text, mode);
            commit(next ?? "", text);
          }}
        />
        {draft.text && !disabled && (
          <button
            type="button"
            aria-label={`Xóa ${calendarLabel || "ngày giờ"}`}
            onClick={() => {
              commit("");
              input.current?.focus();
            }}
            className="absolute right-10 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" />
          </button>
        )}
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) {
              setMonth(selected || new Date());
              setPanel("date");
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`${mode === "time" ? "Chọn giờ" : "Mở lịch"}${calendarLabel ? ` ${calendarLabel}` : ""}`}
              disabled={disabled}
              className="absolute right-1 flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {mode === "time" ? (
                <Clock3 className="size-4" />
              ) : (
                <CalendarDays className="size-4" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            aria-label={`Bảng chọn ${calendarLabel || "ngày giờ"}`}
            className={cn(
              "max-h-[min(36rem,var(--radix-popover-content-available-height))] overflow-y-auto",
              mode === "time" ? "w-64" : "w-[340px]",
            )}
          >
            {mode === "datetime-local" && (
              <div className="mb-3 space-y-2 border-b pb-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={panel === "date" ? "default" : "outline"}
                    aria-pressed={panel === "date"}
                    onClick={() => setPanel("date")}
                  >
                    <CalendarDays />
                    Ngày
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={panel === "time" ? "default" : "outline"}
                    aria-pressed={panel === "time"}
                    onClick={() => setPanel("time")}
                  >
                    <Clock3 />
                    Giờ
                  </Button>
                </div>
                <p className="text-center text-sm tabular-nums text-muted-foreground">
                  {canonical
                    ? displayDateTime(canonical, mode)
                    : "Chọn ngày, sau đó chọn giờ"}
                </p>
              </div>
            )}
            {mode !== "time" &&
              (mode !== "datetime-local" || panel === "date") && (
                <Calendar
                  month={month}
                  onMonthChange={setMonth}
                  selected={selected}
                  min={min ? parseIsoDate(min.slice(0, 10)) : undefined}
                  max={max ? parseIsoDate(max.slice(0, 10)) : undefined}
                  onSelect={(date) => {
                    commit(
                      date
                        ? isoDate(date) +
                            (mode === "datetime-local"
                              ? `T${time || "00:00"}`
                              : "")
                        : "",
                    );
                    if (mode === "date") setOpen(false);
                    else if (date) setPanel("time");
                  }}
                />
              )}
            {mode !== "date" &&
              (mode !== "datetime-local" || panel === "time") && (
                <div className={cn("space-y-2")}>
                  <p className="text-xs text-muted-foreground">Giờ 24 giờ</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs font-medium">Giờ</span>
                      <SelectField
                        id={`${inputId}-hours`}
                        aria-label="Giờ"
                        value={hour}
                        onValueChange={(h) => chooseTime(`${h}:${minute}`)}
                      >
                        {Array.from({ length: 24 }, (_, i) =>
                          String(i).padStart(2, "0"),
                        ).map((h) => (
                          <SelectOption key={h} value={h}>
                            {h}
                          </SelectOption>
                        ))}
                      </SelectField>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium">Phút</span>
                      <SelectField
                        aria-label="Phút"
                        value={minute}
                        onValueChange={(m) => chooseTime(`${hour}:${m}`)}
                      >
                        {Array.from({ length: 60 }, (_, i) =>
                          String(i).padStart(2, "0"),
                        ).map((m) => (
                          <SelectOption key={m} value={m}>
                            {m}
                          </SelectOption>
                        ))}
                      </SelectField>
                    </div>
                  </div>
                </div>
              )}
            <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  commit("");
                  setOpen(false);
                }}
              >
                Xóa chọn
              </Button>
              {mode === "date" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = isoDate(new Date());
                    if ((!min || today >= min) && (!max || today <= max)) {
                      commit(today);
                      setOpen(false);
                    }
                  }}
                >
                  Hôm nay
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={() => setOpen(false)}>
                  Xong
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <input
        ref={hidden}
        type="hidden"
        name={name}
        value={canonical}
        disabled={disabled}
      />
      {invalid && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
