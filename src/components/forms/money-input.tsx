"use client";
import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money";
type Props = Omit<ComponentProps<typeof Input>, "type" | "inputMode" | "value" | "defaultValue" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
};
export function MoneyInput({ value, onValueChange, onBlur, ...props }: Props) {
  return <Input {...props} type="text" inputMode="decimal" value={formatMoneyInput(value)} onBlur={event => {
    if (value.endsWith(".")) onValueChange(value.slice(0, -1));
    onBlur?.(event);
  }} onChange={event => {
    const input = event.currentTarget;
    const next = parseMoneyInput(input.value);
    if (next === null) { input.value = formatMoneyInput(value); return; }
    const beforeCaret = parseMoneyInput(input.value.slice(0, input.selectionStart ?? input.value.length));
    const logicalPosition = beforeCaret?.length ?? 0;
    onValueChange(next);
    requestAnimationFrame(() => {
      if (!input.isConnected || document.activeElement !== input) return;
      let position = 0, logical = 0;
      while (position < input.value.length && logical < logicalPosition) {
        if (input.value[position] !== ".") logical++;
        position++;
      }
      input.setSelectionRange(position, position);
    });
  }} />;
}
