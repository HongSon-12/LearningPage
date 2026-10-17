import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PageHeading } from "@/components/admin/page-heading";

export const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500";
export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50";
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50";

export function PageHeader({
  title,
  description,
  parent,
  action,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  parent?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <PageHeading
      title={title}
      description={description}
      parent={parent}
      action={action}
    />
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "rose";
  hint?: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <Card className="flex-row items-start gap-3 rounded-xl p-5 shadow-none">
      <div className={`rounded-xl p-2.5 ${colors[tone]}`}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <p className="mt-1 text-[32px] leading-9 font-semibold tabular-nums tracking-tight text-slate-900">
          {value}
        </p>
        {hint && <p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">{hint}</p>}
      </div>
    </Card>
  );
}
