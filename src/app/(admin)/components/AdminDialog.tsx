"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export default function AdminDialog({title,subtitle,children,onClose}:{title:string;subtitle?:string;children:ReactNode;onClose:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null);const id=useId();
 useEffect(()=>{const dialog=ref.current;if(dialog&&!dialog.open)dialog.showModal();return()=>{dialog?.close();};},[]);
 return <dialog ref={ref} aria-labelledby={id} onCancel={e=>{e.preventDefault();onClose();}} className="m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"><header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5"><div><h2 id={id} className="text-lg font-bold text-slate-900">{title}</h2>{subtitle&&<p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="Đóng cửa sổ" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={20}/></button></header><div className="max-h-[calc(90vh-100px)] overflow-y-auto p-5 sm:p-6">{children}</div></dialog>;
}
