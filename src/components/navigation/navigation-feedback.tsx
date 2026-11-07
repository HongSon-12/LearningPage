"use client";
import {createContext,useContext,useEffect,useRef,useState,useTransition,type ReactNode,type ComponentProps} from "react";
import NextLink from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {LoaderCircle} from "lucide-react";
import {Skeleton} from "@/components/ui/skeleton";
type Navigation={pending:boolean;target:string;navigate:(href:string,scroll?:boolean)=>void};
const NavigationContext=createContext<Navigation|null>(null);
export function NavigationProvider({children}:{children:ReactNode}){
 const router=useRouter();const [pending,startTransition]=useTransition();const [target,setTarget]=useState("");const locked=useRef(false);
 useEffect(()=>{if(!pending)locked.current=false;},[pending]);
 // The ref closes the gap before the first pending render, including rapid double clicks.
 function navigate(href:string,scroll=true){if(locked.current)return;locked.current=true;setTarget(href);startTransition(()=>router.push(href,{scroll}));}
 return <NavigationContext.Provider value={{pending,target,navigate}}>{children}</NavigationContext.Provider>;
}
export function useNavigationFeedback(){return useContext(NavigationContext);}
export function PendingLink({href,children,scroll,onNavigate,...props}:Omit<ComponentProps<typeof NextLink>,"href">&{href:string}){
 const navigation=useNavigationFeedback();
 return <NextLink {...props} href={href} scroll={scroll} aria-disabled={navigation?.pending || undefined} onNavigate={event=>{
  onNavigate?.(event);
  if(!navigation || href.startsWith("#"))return;
  if(navigation.pending){event.preventDefault();return;}
  const target=new URL(href,window.location.href);
  if(target.origin!==location.origin || (target.pathname===location.pathname && target.search===location.search))return;
  event.preventDefault();if(!navigation.pending)navigation.navigate(href,scroll);
 }}>{children}</NextLink>;
}
export function PageSkeleton({compact=false}:{compact?:boolean}){
 return <div role="status" aria-label="Đang tải nội dung" className="space-y-4 rounded-xl border bg-card p-4 sm:p-5"><span className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true"/>Đang tải nội dung…</span><Skeleton className="h-8 w-56 max-w-full"/>{Array.from({length:compact?3:6},(_,i)=><Skeleton key={i} className="h-14 w-full"/>)}</div>;
}
export function BusyContent({loading,children}:{loading:boolean;children:ReactNode}){
 return <div aria-busy={loading} className="relative min-w-0"><div inert={loading || undefined} className={loading?"pointer-events-none invisible":""}>{children}</div>{loading&&<div className="absolute inset-0 z-10 overflow-hidden bg-background"><PageSkeleton/></div>}</div>;
}
export function NavigationContent({children,withinClass=false}:{children:ReactNode;withinClass?:boolean}){
 const navigation=useNavigationFeedback();const path=usePathname();const course=path.match(/^\/courses\/([^/]+)$/)?.[1];
 const sameClass=!!course && !!navigation?.target && new URL(navigation.target,"http://local").pathname===`/courses/${course}`;
 return <BusyContent loading={!!navigation?.pending && (withinClass?sameClass:!sameClass)}>{children}</BusyContent>;
}
