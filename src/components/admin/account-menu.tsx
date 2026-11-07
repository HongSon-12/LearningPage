"use client";
import {useTransition} from "react";
import {toast} from "sonner";
import {PendingLink as Link} from "@/components/navigation/navigation-feedback";
import {ChevronsUpDown,UserRound,LogOut,LifeBuoy,LoaderCircle} from "lucide-react";
import {logout} from "@/app/actions/auth";
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuLabel,DropdownMenuItem,DropdownMenuSeparator} from "@/components/ui/dropdown-menu";
export function AccountMenu({username,email,role,compact=false,onNavigate}:{username:string;email:string|null;role:string;compact?:boolean;onNavigate?:()=>void}){
 const [pending,startTransition]=useTransition();
 return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" disabled={pending} aria-busy={pending} aria-label="Mở tài khoản cá nhân" className={`flex min-h-14 items-center gap-3 rounded-lg border border-transparent p-2 text-left transition hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-ring ${compact?"":"w-full"}`}>
 <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-sm font-bold text-blue-700">{username.slice(0,2).toUpperCase()}</span>{!compact&&<span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{username}</span><span className="block truncate text-xs text-muted-foreground">{email||role}</span></span>}{pending?<LoaderCircle className="size-4 shrink-0 animate-spin"/>:<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground"/>}</button></DropdownMenuTrigger>
 <DropdownMenuContent side={compact?"bottom":"right"} align="end" sideOffset={8} className="w-64"><DropdownMenuLabel><span className="block truncate font-semibold">{username}</span><span className="block truncate text-xs font-normal text-muted-foreground">{email||role}</span></DropdownMenuLabel><DropdownMenuSeparator/>
 <DropdownMenuItem asChild className="min-h-11 cursor-pointer"><Link href="/account" onClick={onNavigate}><UserRound/>Tài khoản</Link></DropdownMenuItem><DropdownMenuSeparator/>
 <DropdownMenuItem asChild className="min-h-11 cursor-pointer"><Link href="/help" onClick={onNavigate}><LifeBuoy/>Hỗ trợ</Link></DropdownMenuItem><DropdownMenuSeparator/>
 <DropdownMenuItem className="min-h-11 cursor-pointer" disabled={pending} onSelect={()=>startTransition(async()=>{try{const result=await logout();if(result?.success===false)toast.error(result.error);}catch(error){if(error instanceof TypeError)toast.error("Chưa đăng xuất được. Vui lòng thử lại.");else throw error;}})}>{pending?<LoaderCircle className="animate-spin"/>:<LogOut/>}{pending?"Đang thoát…":"Đăng xuất"}</DropdownMenuItem>
 </DropdownMenuContent></DropdownMenu>;
}
