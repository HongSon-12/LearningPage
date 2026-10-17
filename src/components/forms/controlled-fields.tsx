"use client";
import {
  useController,
  type Control,
  type FieldValues,
  type FieldPath,
} from "react-hook-form";
import type { ComponentProps } from "react";
import { SelectField } from "./select-field";
import { DateTimePicker } from "./date-time-picker";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
type Binding<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
};
export function ControlledSelectField<T extends FieldValues>({
  name,
  control,
  ...props
}: Omit<
  ComponentProps<typeof SelectField>,
  "name" | "value" | "defaultValue" | "onValueChange" | "ref"
> &
  Binding<T>) {
  const { field } = useController({ name, control });
  return (
    <SelectField
      {...props}
      name={name}
      ref={(node) => field.ref(node)}
      value={String(field.value ?? "")}
      onValueChange={field.onChange}
      onBlur={field.onBlur}
    />
  );
}
export function ControlledDateTimeField<T extends FieldValues>({
  name,
  control,
  label,
  id,
  required,
  ...props
}: Omit<
  ComponentProps<typeof DateTimePicker>,
  "name" | "value" | "defaultValue" | "onValueChange" | "ref"
> &
  Binding<T> & { label: string }) {
  const { field, fieldState } = useController({ name, control });
  const fieldId = id ?? name;
  return (
    <Field data-invalid={Boolean(fieldState.error)} className="gap-2">
      <FieldLabel htmlFor={fieldId}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </FieldLabel>
      <DateTimePicker
        {...props}
        id={fieldId}
        name={name}
        ref={(node) => field.ref(node)}
        required={required}
        calendarLabel={label}
        value={String(field.value ?? "")}
        onValueChange={field.onChange}
        onBlur={field.onBlur}
        aria-invalid={Boolean(fieldState.error)}
        aria-describedby={fieldState.error ? `${fieldId}-error` : undefined}
      />
      <FieldError id={`${fieldId}-error`}>
        {fieldState.error?.message}
      </FieldError>
    </Field>
  );
}
