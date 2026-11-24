"use client";
import { toast } from "sonner";
import { useEffect,useId,useRef,useState } from "react";
import { Camera,Upload,Check,Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from "@/components/ui/dialog";
import { UPLOAD_ACCEPT,UPLOAD_HINT,uploadFileError } from "@/lib/upload-policy";
import { CameraPreview } from "@/components/forms/camera-preview";
export function DocumentUpload({label,uploaded,busy,disabled,onUpload,guide="document"}:{label:string;uploaded:boolean;busy:boolean;disabled:boolean;onUpload:(file:File)=>Promise<void>;guide?:"card"|"document"}) {
  const id=useId(),input=useRef<HTMLInputElement>(null),capture=useRef<HTMLInputElement>(null),video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),generation=useRef(0);
  const [open,setOpen]=useState(false),[camera,setCamera]=useState(false),[starting,setStarting]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState("");
  const [pending,setPending]=useState(false);
  const [cameraStream,setCameraStream]=useState<MediaStream|null>(null);
  function stop(){generation.current++;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;setCameraStream(null);setCamera(false);setStarting(false);setReady(false);}
  useEffect(()=>()=>{generation.current++;stream.current?.getTracks().forEach(track=>track.stop());},[]);
  useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener("visibilitychange",hide);return()=>document.removeEventListener("visibilitychange",hide);},[]);
  useEffect(()=>{if(camera&&video.current&&stream.current){video.current.srcObject=stream.current;void video.current.play().catch(()=>{setError("Không phát được camera. Bạn có thể tải ảnh lên.");stop();});}},[camera]);
  function changeOpen(value:boolean){if(!value)stop();setOpen(value);}
  async function upload(file:File){
    const invalid=uploadFileError(file);if(invalid){setError(invalid);toast.error(invalid);return;}
    stop();setOpen(false);setPending(true);setError("");
    try{await onUpload(file);toast.success("Đã tải lên tài liệu.");}catch(error){const message=error instanceof Error?error.message:"Chưa tải được file. Hãy thử lại.";setError(message);toast.error(message);}finally{setPending(false);}
  }
  async function startCamera(){
    setError("");
    // Prefer the in-app preview on mobile too, so alignment and focus controls are available.
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){capture.current?.click();return;}
    const current=++generation.current;setStarting(true);
    try{
      const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}},audio:false});
      if(current!==generation.current){media.getTracks().forEach(track=>track.stop());return;}
      stream.current=media;setCameraStream(media);setCamera(true);
    }catch{if(current===generation.current)setError("Không mở được camera. Hãy cho phép truy cập camera hoặc tải ảnh lên.");}finally{if(current===generation.current)setStarting(false);}
  }
  async function takePhoto(){
    const source=video.current;if(!source?.videoWidth||!source.videoHeight)return;
    const scale=Math.min(1,1920/Math.max(source.videoWidth,source.videoHeight));const canvas=document.createElement("canvas");canvas.width=Math.round(source.videoWidth*scale);canvas.height=Math.round(source.videoHeight*scale);
    const context=canvas.getContext("2d");if(!context){setError("Không chụp được ảnh. Hãy tải ảnh lên.");return;}context.drawImage(source,0,0,canvas.width,canvas.height);
    setPending(true);
    const current=generation.current;
    try{const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",0.9));if(current!==generation.current)return;if(!blob)throw new Error("Không chụp được ảnh. Hãy thử lại.");await upload(new File([blob],`camera-${Date.now()}.jpg`,{type:"image/jpeg"}));}catch(error){setError(error instanceof Error?error.message:"Không chụp được ảnh.");}finally{setPending(false);}
  }
  const locked=disabled||busy||pending;
  function picked(event:React.ChangeEvent<HTMLInputElement>){const file=event.currentTarget.files?.[0];event.currentTarget.value="";if(file)void upload(file);}
  return <div className="space-y-2" role="group" aria-labelledby={`${id}-label`}>
    <p id={`${id}-label`} className="text-sm font-semibold text-gray-700">{label}</p>
    <button type="button" disabled={locked} onClick={()=>{setError("");setOpen(true);}} aria-label={`${uploaded?"Đổi":"Chọn"} ${label}`} aria-describedby={`${id}-hint`} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white/60 p-4 text-sm text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60">
      {busy||pending?<><Loader2 className="size-6 animate-spin"/>Đang tải…</>:uploaded?<><Check className="size-6 text-emerald-600"/><span className="font-medium text-emerald-700">Đã tải lên · Bấm để đổi</span></>:<><Upload className="size-6"/>Chọn ảnh hoặc tài liệu</>}
    </button>
    <p id={`${id}-hint`} className="text-xs leading-5 text-gray-500">{UPLOAD_HINT}</p>
    <input ref={input} type="file" accept={UPLOAD_ACCEPT} aria-label={`Tải file ${label}`} disabled={locked} onChange={picked} className="hidden"/>
    <input ref={capture} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label={`Chụp file ${label}`} disabled={locked} onChange={picked} className="hidden"/>
    {error&&!open&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
    <Dialog open={open} onOpenChange={changeOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{camera?"Chụp ảnh":label}</DialogTitle><DialogDescription>{camera?"Đặt giấy tờ trong khung hình, đủ sáng và rõ chữ.":"Chọn cách thêm ảnh hoặc tài liệu."}</DialogDescription></DialogHeader>
      {camera?<><CameraPreview videoRef={video} stream={cameraStream} kind={guide} ready={ready} onReady={()=>setReady(true)} label="Camera chụp giấy tờ"/><div className="flex flex-wrap gap-3"><Button type="button" disabled={!ready||pending} onClick={()=>void takePhoto()}><Camera/>Chụp</Button><Button type="button" variant="outline" disabled={pending} onClick={stop}>Quay lại</Button></div></>:<div className="grid gap-3 sm:grid-cols-2"><Button type="button" className="min-h-16" disabled={starting||locked} onClick={()=>void startCamera()}>{starting?<Loader2 className="animate-spin"/>:<Camera/>}Chụp ảnh</Button><Button type="button" variant="outline" className="min-h-16" disabled={locked} onClick={()=>input.current?.click()}><Upload/>Tải lên</Button><Button type="button" variant="ghost" className="sm:col-span-2" disabled={starting||locked} onClick={()=>capture.current?.click()}>Dùng camera mặc định của thiết bị</Button></div>}
      <p className="text-sm text-muted-foreground">{UPLOAD_HINT}</p>{error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
    </DialogContent></Dialog>
  </div>;
}
