import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";

export const fieldClass="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500";
export const primaryButton="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50";
export const secondaryButton="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50";

export function PageHeader({title,description,icon:Icon,parent,action}:{title:string;description:string;icon:LucideIcon;parent?:{href:string;label:string};action?:ReactNode}) {
 return <header className="space-y-5"><nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><Link href={parent?.href||"/"} className="hover:text-blue-700">{parent?.label||"Quản trị"}</Link><ChevronRight size={13} aria-hidden="true"/><span className="text-slate-700">{title}</span></nav><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-4"><div className="hidden rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-600 sm:block"><Icon size={26} aria-hidden="true"/></div><div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p></div></div>{action}</div></header>;
}

export function StatCard({label,value,icon:Icon,tone="blue",hint}:{label:string;value:ReactNode;icon:LucideIcon;tone?:"blue"|"green"|"amber"|"rose";hint?:string}) {
 const colors={blue:"bg-blue-50 text-blue-600",green:"bg-emerald-50 text-emerald-600",amber:"bg-amber-50 text-amber-600",rose:"bg-rose-50 text-rose-600"};
 return <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5"><div className={`rounded-xl p-2.5 ${colors[tone]}`}><Icon size={20} aria-hidden="true"/></div><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>{hint&&<p className="mt-1 text-xs text-slate-500">{hint}</p>}</div></div>;
}
