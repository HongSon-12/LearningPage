"use client";
import * as React from "react";
import { Select as Primitive } from "radix-ui";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
export const Select = Primitive.Root;
export const SelectValue = Primitive.Value;
export function SelectTrigger({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "ui-control flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2 text-left text-base md:text-sm shadow-xs outline-none transition-[color,box-shadow] hover:border-ring/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>span:first-child]:line-clamp-1 [&>span:first-child]:break-all",
        className,
      )}
      {...props}
    >
      {children}
      <Primitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Primitive.Icon>
    </Primitive.Trigger>
  );
}
export function SelectContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        data-slot="select-content"
        position="popper"
        sideOffset={6}
        collisionPadding={12}
        className={cn(
          "ui-overlay relative z-[80] max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          className,
        )}
        {...props}
      >
        <Primitive.ScrollUpButton className="flex h-6 items-center justify-center bg-popover">
          <ChevronUp className="size-4" />
        </Primitive.ScrollUpButton>
        <Primitive.Viewport className="p-1.5">{children}</Primitive.Viewport>
        <Primitive.ScrollDownButton className="flex h-6 items-center justify-center bg-popover">
          <ChevronDown className="size-4" />
        </Primitive.ScrollDownButton>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export function SelectItem({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-10 cursor-default select-none items-center rounded-md py-2 pr-9 pl-3 text-sm leading-5 outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:font-medium data-[state=checked]:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    >
      <Primitive.ItemText>
        <span className="block max-w-[min(30rem,calc(100vw-5rem))] break-words whitespace-normal">
          {children}
        </span>
      </Primitive.ItemText>
      <Primitive.ItemIndicator className="absolute right-3 flex size-4 items-center justify-center">
        <Check className="size-4" />
      </Primitive.ItemIndicator>
    </Primitive.Item>
  );
}
