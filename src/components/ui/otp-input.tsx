"use client";
import {useRef,useState,type InputHTMLAttributes} from "react";
import {cn} from "@/lib/utils";
export const OTP_LENGTH=6;
const digits=(text:string)=>text.replace(/[^0-9]/g,"").slice(0,OTP_LENGTH);
type Props=Omit<InputHTMLAttributes<HTMLInputElement>,"value"|"onChange"|"type"|"maxLength"|"size">&{id:string;value:string;onValueChange:(value:string)=>void};
export function OtpInput({id,value,onValueChange,disabled,required=true,className,"aria-describedby":describedBy,...props}:Props){
 const input=useRef<HTMLInputElement>(null);const [focused,setFocused]=useState(false);const [active,setActive]=useState(0);
 const code=digits(value);const helpId=`${id}-progress`;
 function commit(next:string,position=next.length){
  input.current?.setCustomValidity("");onValueChange(next);
  requestAnimationFrame(()=>{input.current?.setSelectionRange(position,position);setActive(Math.min(position,OTP_LENGTH-1));});
 }
 return <div className={cn("min-w-0 space-y-2",className)} data-slot="otp-input">
  <div className={cn("relative h-12 w-full max-w-[22rem] sm:h-14",disabled&&"opacity-50")}>
   {/* One native field preserves autofill, paste, selection and screen-reader navigation. */}
   <input {...props} ref={input} id={id} type="text" value={code} disabled={disabled} required={required} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={OTP_LENGTH} spellCheck={false} autoCapitalize="off" aria-describedby={[describedBy,helpId].filter(Boolean).join(" ")} title="Nhập đủ 6 chữ số trong mã xác thực" className="absolute inset-0 z-10 h-full w-full min-w-0 cursor-text rounded-lg border-0 bg-transparent p-0 text-transparent caret-transparent outline-none selection:bg-transparent disabled:cursor-not-allowed" style={{WebkitTextFillColor:"transparent"}}
    onChange={event=>{const position=digits(event.currentTarget.value.slice(0,event.currentTarget.selectionStart??OTP_LENGTH)).length;commit(digits(event.currentTarget.value),position);}}
    onFocus={event=>{setFocused(true);setActive(Math.min(event.currentTarget.selectionStart??code.length,OTP_LENGTH-1));props.onFocus?.(event);}}
    onBlur={event=>{setFocused(false);props.onBlur?.(event);}}
    onSelect={event=>setActive(Math.min(event.currentTarget.selectionStart??code.length,OTP_LENGTH-1))}
    onPaste={event=>{event.preventDefault();commit(digits(event.clipboardData.getData("text")));}}
    onPointerDown={event=>{
     if(disabled || event.button!==0)return;event.preventDefault();const bounds=event.currentTarget.getBoundingClientRect();
     const index=Math.min(code.length,OTP_LENGTH-1,Math.max(0,Math.floor((event.clientX-bounds.left)/bounds.width*OTP_LENGTH)));
     event.currentTarget.focus();event.currentTarget.setSelectionRange(index,Math.min(index+1,code.length));setActive(index);
    }}
    onInvalid={event=>{event.currentTarget.setCustomValidity("Vui lòng nhập đủ 6 chữ số trong mã xác thực.");props.onInvalid?.(event);}}
   />
   <div aria-hidden="true" className="grid h-full grid-cols-6 gap-2">
    {Array.from({length:OTP_LENGTH},(_,index)=><span key={index} data-slot="otp-cell" data-active={focused&&index===active?"true":undefined} className={cn("flex min-w-0 items-center justify-center rounded-lg border bg-card text-xl font-semibold tabular-nums shadow-sm",code[index]&&"border-blue-200 bg-blue-50/40",focused&&index===active&&"border-primary ring-2 ring-primary/20",props["aria-invalid"]&&"border-destructive")}>{code[index]||(focused&&index===active?<span className="h-6 w-0.5 animate-pulse bg-primary motion-reduce:animate-none"/>:null)}</span>)}
   </div>
  </div>
  <p id={helpId} className="text-xs text-muted-foreground" aria-live="polite" aria-atomic="true">Đã nhập {code.length}/{OTP_LENGTH} chữ số.</p>
 </div>;
}
