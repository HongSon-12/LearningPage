"use client";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
export type PageTitle = {
  path: string;
  title: string;
  parent?: { href: string; label: string };
  marker: string;
};
export const PageTitleContext = createContext<Dispatch<
  SetStateAction<PageTitle | null>
> | null>(null);
export function PageHeading({
  title,
  description,
  parent,
  action,
}: {
  title: string;
  description: string;
  parent?: { href: string; label: string };
  action?: ReactNode;
}) {
  const publish = useContext(PageTitleContext);
  const path = usePathname();
  const marker = useId();
  const parentHref = parent?.href,
    parentLabel = parent?.label;
  useEffect(() => {
    if (!publish) return;
    publish({
      path,
      title,
      parent:
        parentHref && parentLabel
          ? { href: parentHref, label: parentLabel }
          : undefined,
      marker,
    });
    return () =>
      publish((current) => (current?.marker === marker ? null : current));
  }, [publish, path, title, parentHref, parentLabel, marker]);
  return (
    <div
      data-slot="page-intro"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
    >
      <p className="min-w-0 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
