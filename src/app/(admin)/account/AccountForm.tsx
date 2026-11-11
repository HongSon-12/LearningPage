"use client";
import { toast } from "sonner";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {accountInput,type AccountInput} from "@/lib/account-input";
import {saveOwnAccount} from "@/app/actions/account";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
export default function AccountForm({email}:{email:string}){
 const router=useRouter();const [notice,setNotice]=useState("");
 const {register,handleSubmit,setError,reset,formState:{errors,isSubmitting}}=useForm<AccountInput>({resolver:zodResolver(accountInput),defaultValues:{email,newPassword:"",confirmPassword:""}});
 async function submit(values:AccountInput){setNotice("");try{const result=await saveOwnAccount(values);if(!result.success){setError("root",{message:result.error});toast.error(result.error);return;}reset({...values,newPassword:"",confirmPassword:""});if(result.changed){toast.success("Đã lưu tài khoản. Vui lòng đăng nhập lại.");router.replace("/login");}else {setNotice("Thông tin chưa thay đổi.");toast.info("Thông tin chưa thay đổi.");}}catch{toast.error("Chưa lưu được. Vui lòng thử lại.");setError("root",{message:"Chưa lưu được. Vui lòng thử lại."});}}
 return <form className="space-y-5" onSubmit={handleSubmit(submit)} aria-label="Cập nhật tài khoản" aria-busy={isSubmitting}>
 <div className="space-y-2"><Label htmlFor="self-email">Email khôi phục</Label><Input id="self-email" type="email" autoComplete="email" disabled={isSubmitting} {...register("email")}/><p className="text-sm text-muted-foreground">Dùng để nhận mã khi quên mật khẩu.</p>{errors.email&&<p role="alert" className="text-sm text-destructive">{errors.email.message}</p>}</div>
 <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="self-new-password">Mật khẩu mới</Label><Input id="self-new-password" type="password" autoComplete="new-password" disabled={isSubmitting} {...register("newPassword")}/><p className="text-sm text-muted-foreground">Để trống nếu chỉ đổi email. Ít nhất 10 ký tự, tối đa 72 byte.</p>{errors.newPassword&&<p role="alert" className="text-sm text-destructive">{errors.newPassword.message}</p>}</div><div className="space-y-2"><Label htmlFor="self-confirm">Nhập lại mật khẩu mới</Label><Input id="self-confirm" type="password" autoComplete="new-password" disabled={isSubmitting} {...register("confirmPassword")}/>{errors.confirmPassword&&<p role="alert" className="text-sm text-destructive">{errors.confirmPassword.message}</p>}</div></div>
 <p className="border-t pt-5 text-sm text-muted-foreground">Sau khi lưu thay đổi, bạn cần đăng nhập lại trên các thiết bị.</p>
 {errors.root&&<p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}{notice&&<p role="status" className="text-sm text-muted-foreground">{notice}</p>}
 <div className="flex justify-end"><Button loading={isSubmitting}>{isSubmitting?"Đang lưu…":"Lưu"}</Button></div>
 </form>;
}
