"use client";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
const EMPTY = "__empty_selection__";
const encode = (value: string) => value || EMPTY;
type Props = Omit<
  ComponentProps<typeof SelectTrigger>,
  "value" | "defaultValue" | "onChange" | "children" | "name"
> & {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
  containerClassName?: string;
};
export function SelectField({
  children,
  value,
  defaultValue = "",
  onValueChange,
  name,
  placeholder = "Chọn…",
  required,
  disabled,
  containerClassName,
  ...props
}: Props) {
  const [internal, setInternal] = useState(defaultValue);
  const hidden = useRef<HTMLInputElement>(null);
  const selected = value ?? internal;
  useEffect(() => {
    const form = hidden.current?.form;
    if (!form || value !== undefined) return;
    const reset = () => setInternal(defaultValue);
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [defaultValue, value]);
  return (
    <div className={cn("ui-control w-full min-w-0", containerClassName)}>
      <Select
        value={required && !selected ? "" : encode(selected)}
        onValueChange={(next) => {
          const decoded = next === EMPTY ? "" : next;
          if (value === undefined) setInternal(decoded);
          onValueChange?.(decoded);
        }}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger {...props} disabled={disabled} aria-required={required}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
        <input
          ref={hidden}
          type="hidden"
          name={name}
          value={selected}
          disabled={disabled}
        />
      </Select>
    </div>
  );
}
export function SelectOption({
  value,
  children,
  ...props
}: Omit<ComponentProps<typeof SelectItem>, "value"> & { value: string }) {
  return (
    <SelectItem data-value={value} value={encode(value)} {...props}>
      {children}
    </SelectItem>
  );
}
