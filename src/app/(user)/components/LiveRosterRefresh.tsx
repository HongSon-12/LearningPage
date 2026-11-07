"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function LiveRosterRefresh({initialSnapshot}:{initialSnapshot:string}){
 const router=useRouter();
 useEffect(()=>{
  // Only the schedule needs live availability; avoid refreshing every public page.
  let stopped=false,timer:ReturnType<typeof setTimeout>,snapshot=initialSnapshot;
  const controller=new AbortController();
  async function poll(){
   try{
    if(document.visibilityState==="visible"){
     const response=await fetch("/api/classes",{signal:controller.signal,cache:"no-store"});
     if(response.ok){const next=await response.text();if(snapshot!==undefined && snapshot!==next)router.refresh();snapshot=next;}
    }
   }catch{/* Retry quietly on the next interval. */}
   finally{if(!stopped)timer=setTimeout(poll,20000);}
  }
  void poll();
  return ()=>{stopped=true;controller.abort();clearTimeout(timer);};
 },[router,initialSnapshot]);
 return null;
}
