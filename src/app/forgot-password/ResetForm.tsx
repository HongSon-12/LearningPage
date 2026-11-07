"use client";
import { useState } from "react";
import { requestReset,resetPassword } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import {OtpInput} from "@/components/ui/otp-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function ResetForm(){
  const [code,setCode]=useState("");const [email,setEmail]=useState("");const [challengeId,setChallengeId]=useState("");const [busy,setBusy]=useState(false);const [done,setDone]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
  async function request(){setBusy(true);setError("");try{const result=await requestReset(email);if(result.success){setChallengeId(result.challengeId);setCode("");setMessage(result.message);}else setError(result.error);}catch{setError("Không thể gửi yêu cầu. Hãy thử lại.");}finally{setBusy(false);}}
  return done?<p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">Đã đổi mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.</p>:<div className="space-y-5">
    <form className="space-y-4" onSubmit={event=>{event.preventDefault();void request();}}><div className="space-y-2"><Label htmlFor="reset-email">Email khôi phục</Label><Input id="reset-email" type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy||Boolean(challengeId)} onChange={event=>setEmail(event.target.value)}/></div>{!challengeId&&<Button className="w-full" loading={busy}>{busy?"Đang gửi…":"Nhận mã"}</Button>}</form>
    {message&&<p role="status" className="rounded-lg bg-muted p-3 text-sm leading-6">{message}</p>}
    {challengeId&&<form className="space-y-4" onSubmit={async event=>{event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setError("");try{const result=await resetPassword({challengeId,code:String(form.get("code")||""),password:String(form.get("password")||""),confirm:String(form.get("confirm")||"")});if(result.success)setDone(true);else setError(result.error);}catch{setError("Không thể đổi mật khẩu. Hãy thử lại.");}finally{setBusy(false);}}}>
      <div className="space-y-2"><Label htmlFor="reset-code">Mã xác thực</Label><OtpInput id="reset-code" name="code" value={code} onValueChange={setCode} disabled={busy}/></div>
      <div className="space-y-2"><Label htmlFor="reset-password">Mật khẩu mới</Label><Input id="reset-password" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required disabled={busy}/><p className="text-sm text-muted-foreground">Ít nhất 10 ký tự, tối đa 72 byte.</p></div>
      <div className="space-y-2"><Label htmlFor="reset-confirm">Nhập lại mật khẩu</Label><Input id="reset-confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} maxLength={72} required disabled={busy}/></div>
      <Button className="w-full" loading={busy} disabled={code.length!==6}>{busy?"Đang lưu…":"Đổi mật khẩu"}</Button><div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={busy} onClick={()=>void request()}>Gửi lại mã</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>{setChallengeId("");setCode("");setMessage("");setError("");}}>Đổi email</Button></div>
    </form>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
