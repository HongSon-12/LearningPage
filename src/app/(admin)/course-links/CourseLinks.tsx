"use client";

import { useState, useSyncExternalStore } from "react";
import { ArrowUpRight, Check, ChevronRight, Copy, ExternalLink, Globe, HeartPulse, Link2, MessageCircle, Megaphone, ShieldPlus, Stethoscope, Truck, Users } from "lucide-react";

const subscribe = () => () => {};
function useOrigin() {
 return useSyncExternalStore(subscribe, () => window.location.origin, () => "");
}

const channels = [
 {label:"Link trực tiếp",source:"",description:"Gửi qua email, tin nhắn hoặc chia sẻ trực tiếp.",icon:Globe,color:"bg-slate-100 text-slate-600"},
 {label:"Facebook",source:"facebook",description:"Dùng trong bài đăng và tin nhắn Facebook.",icon:Users,color:"bg-blue-50 text-blue-600"},
 {label:"Zalo",source:"zalo",description:"Chia sẻ với học viên hoặc nhóm Zalo.",icon:MessageCircle,color:"bg-sky-50 text-sky-600"},
 {label:"Fanpage",source:"fanpage",description:"Dùng cho nội dung trên trang Fanpage.",icon:Megaphone,color:"bg-violet-50 text-violet-600"},
];

const courseStyles = {
 COMMUNITY_FIRST_AID:{icon:Users,color:"bg-blue-50 text-blue-600",label:"Cộng đồng"},
 CME_ABCDE:{icon:Stethoscope,color:"bg-teal-50 text-teal-600",label:"Đào tạo CME"},
 AMBULANCE_DRIVER:{icon:Truck,color:"bg-amber-50 text-amber-600",label:"Vận chuyển cấp cứu"},
 CPR_ADVANCED:{icon:HeartPulse,color:"bg-violet-50 text-violet-600",label:"Hồi sinh nâng cao"},
 CPR_BASIC:{icon:ShieldPlus,color:"bg-rose-50 text-rose-600",label:"Hồi sinh cơ bản"},
};

type Program = {id:string;title:string;path:string;description:string;audience:string};

function ShareLinks({program}:{program:Program}) {
 const origin=useOrigin();
 const [copied,setCopied]=useState<string|null>(null);
 const [busy,setBusy]=useState<string|null>(null);
 const [message,setMessage]=useState("");
 const [failed,setFailed]=useState(false);

 async function copy(link:string,label:string) {
  setBusy(label);setMessage("");setFailed(false);
  try {
   const absolute=new URL(link,window.location.origin).href;
   if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(absolute);
   else {
    const previousFocus=document.activeElement;
    const input=document.createElement("textarea");input.value=absolute;input.style.position="fixed";input.style.opacity="0";document.body.appendChild(input);input.select();
    try {if(!document.execCommand("copy")) throw new Error("copy");}
    finally {input.remove();if(previousFocus instanceof HTMLElement)previousFocus.focus();}
   }
   setCopied(label);setMessage(`Đã sao chép link ${label} của khóa ${program.title}.`);
  } catch {
   setCopied(null);setFailed(true);setMessage("Không thể tự sao chép. Hãy chọn đường dẫn trong ô để sao chép thủ công.");
  } finally {setBusy(null);}
 }

 return <div className="space-y-4">
  <div className="grid gap-4 xl:grid-cols-2">{channels.map(channel=>{
   const link=program.path+(channel.source?`?source=${channel.source}`:"");
   const Icon=channel.icon;const isCopied=copied===channel.label;
   return <article key={channel.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-blue-200">
    <div className="mb-4 flex items-start gap-3">
     <div className={`shrink-0 rounded-xl p-2.5 ${channel.color}`}><Icon size={20} aria-hidden="true"/></div>
     <div><h3 className="font-semibold text-slate-900">{channel.label}</h3><p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">{channel.description}</p></div>
    </div>
    <label className="sr-only" htmlFor={`link-${program.id}-${channel.label}`}>Đường dẫn {channel.label} — {program.title}</label>
    <input id={`link-${program.id}-${channel.label}`} readOnly value={origin+link} onFocus={e=>e.target.select()} className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-600 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
    <div className="mt-3 flex items-center gap-2">
     <button disabled={busy!==null} onClick={()=>copy(link,channel.label)} aria-label={`Sao chép link ${channel.label} của ${program.title}`} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 ${isCopied?"bg-emerald-50 text-emerald-700":"bg-blue-600 text-white hover:bg-blue-700"}`}>
      {isCopied?<Check size={16} aria-hidden="true"/>:<Copy size={16} aria-hidden="true"/>}{busy===channel.label?"Đang sao chép…":isCopied?"Đã sao chép":"Sao chép link"}
     </button>
     <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`Mở link ${channel.label} của ${program.title} trong tab mới`} title="Mở trang trong tab mới" className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2.5 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"><ExternalLink size={18} aria-hidden="true"/></a>
    </div>
   </article>;
  })}</div>
  <p role="status" aria-live="polite" className={`min-h-5 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 ${failed?"text-rose-600":"text-emerald-700"}`}>{message}</p>
 </div>;
}

export default function CourseLinks({programs}:{programs:Program[]}) {
 const [selectedId,setSelectedId]=useState(programs[0]?.id || "");
 const selected=programs.find(program=>program.id===selectedId) || programs[0];
 if(!selected)return null;
 const style=courseStyles[selected.id as keyof typeof courseStyles] || courseStyles.COMMUNITY_FIRST_AID;
 const Icon=style.icon;

 return <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
  <nav aria-label="Chọn khóa học" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
   <div className="px-3 pb-3 pt-2"><h2 className="text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-semibold uppercase tracking-wider text-slate-500">Danh sách khóa học</h2><p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-400">Chọn chương trình để lấy link</p></div>
   <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">{programs.map(program=>{
    const active=selected.id===program.id;
    const theme=courseStyles[program.id as keyof typeof courseStyles] || courseStyles.COMMUNITY_FIRST_AID;
    const CourseIcon=theme.icon;
    return <button key={program.id} aria-pressed={active} onClick={()=>setSelectedId(program.id)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${active?"border-blue-200 bg-blue-50/80":"border-transparent hover:border-slate-100 hover:bg-slate-50"}`}>
     <span className={`shrink-0 rounded-lg p-2 ${active?"bg-blue-600 text-white":theme.color}`}><CourseIcon size={18} aria-hidden="true"/></span>
     <span className="min-w-0 flex-1"><span className={`block text-sm font-semibold leading-5 ${active?"text-blue-900":"text-slate-700"}`}>{program.title}</span><span className={`mt-1 block text-[length:var(--ui-caption-size,0.8125rem)] leading-5 ${active?"text-blue-600":"text-slate-400"}`}>{active?"Đang chọn":theme.label}</span></span>
     <ChevronRight size={16} aria-hidden="true" className={`shrink-0 ${active?"text-blue-600":"text-slate-300"}`}/>
    </button>;
   })}</div>
  </nav>

  <section aria-label={`Link của ${selected.title}`} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
   <header className="border-b border-slate-100 bg-gradient-to-br from-blue-50/70 via-white to-white p-5 sm:p-7">
    <div className="mb-4 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-medium text-blue-700"><Link2 size={13} aria-hidden="true"/>Link chương trình</span><a href={selected.path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 font-semibold text-blue-600 transition hover:text-blue-800">Xem trang khóa học<ArrowUpRight size={15} aria-hidden="true"/></a></div>
    <div className="flex items-start gap-4"><div className={`hidden shrink-0 rounded-2xl p-3 sm:block ${style.color}`}><Icon size={26} aria-hidden="true"/></div><div><h2 className="text-xl font-bold leading-8 tracking-tight text-slate-900 sm:text-2xl">{selected.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{selected.description}</p><p className="mt-3 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500"><span className="font-semibold text-slate-600">Đối tượng:</span> {selected.audience}</p></div></div>
   </header>
   <div className="p-5 sm:p-7"><div className="mb-5"><h2 className="text-sm font-semibold text-slate-800">Chia sẻ theo kênh</h2><p className="mt-1 text-[length:var(--ui-caption-size,0.8125rem)] leading-5 text-slate-500">Các đường dẫn đều mở trang giới thiệu khóa học đang chọn.</p></div><ShareLinks key={selected.id} program={selected}/></div>
  </section>
 </div>;
}
