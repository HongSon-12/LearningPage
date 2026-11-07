"use client";
import {useTransition} from "react";
import {AlertCircle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {PendingLink} from "./navigation-feedback";
export default function RouteError({error,retry,supportHref="/help",supportLabel="Hỗ trợ"}:{error:Error&{digest?:string};retry:()=>void;supportHref?:string;supportLabel?:string}){
 const [pending,startTransition]=useTransition();
 return <section role="alert" className="mx-auto max-w-lg space-y-4 rounded-xl border bg-card p-6 text-center"><AlertCircle className="mx-auto size-8 text-destructive"/><h2 className="text-xl font-semibold">Chưa thể tải nội dung</h2><p className="text-sm text-muted-foreground">Vui lòng thử lại. Nếu vẫn gặp lỗi, hãy liên hệ đơn vị quản lý và cung cấp mã tham chiếu nếu có.</p>{error.digest&&<p className="break-all text-xs text-muted-foreground">Mã tham chiếu: {error.digest}</p>}{process.env.NODE_ENV==="development"&&<details className="text-left text-sm"><summary>Chi tiết lỗi trong môi trường dev</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap">{error.message}</pre></details>}<div className="flex justify-center gap-3"><Button loading={pending} onClick={()=>startTransition(()=>retry())}>{pending?"Đang thử lại…":"Thử lại"}</Button><Button variant="outline" asChild><PendingLink href={supportHref}>{supportLabel}</PendingLink></Button></div></section>;
}
