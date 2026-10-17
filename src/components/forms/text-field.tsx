"use client";
import type { ComponentProps } from "react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Props = ComponentProps<typeof Input> & { label: string; error?: string };
export function TextField({ label, error, id, name, ...props }: Props) {
  const fieldId = id ?? name;
  return (
    <Field data-invalid={Boolean(error)} className="gap-2">
      <FieldLabel htmlFor={fieldId}>
        {label}
        {props.required && (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </FieldLabel>
      <Input
        {...props}
        id={fieldId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : undefined}
      />
      <FieldError id={`${fieldId}-error`}>{error}</FieldError>
    </Field>
  );
}
