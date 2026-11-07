"use client";
import { useState } from "react";
import { ShieldCheck, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField,SelectOption } from "@/components/forms/select-field";
import { permissionCatalog, permissionKeys, defaultRolePermissions, adminOnly, withDependencies, withoutDependents, type PermissionKey } from "@/lib/permission-catalog";
import { roleLabels } from "@/lib/user-input";
import { saveRolePolicy,saveCustomRole } from "@/app/actions/roles";
type Role="CLASS_MANAGER"|"ACCOUNTANT";
type Policy={version:number;permissions:PermissionKey[]};
type Entry=Policy & {id:string;name:string;baseRole:Role|"ADMIN";builtIn?:boolean};
export default function PermissionEditor({policies,customRoles}:{policies:Record<Role,Policy>;customRoles:{id:string;name:string;baseRole:Role|"ADMIN";version:number;permissions:PermissionKey[]}[]}) {
  const initial:Record<string,Entry>=Object.fromEntries([
    {id:"ADMIN",name:roleLabels.ADMIN,baseRole:"ADMIN" as const,builtIn:true,version:0,permissions:permissionKeys},
    ...(["CLASS_MANAGER","ACCOUNTANT"] as const).map(role=>({id:role,name:roleLabels[role],baseRole:role,builtIn:true,...policies[role]})),...customRoles,
  ].map(item=>[item.id,{...item,permissions:[...new Set(["dashboard.view" as const,...item.permissions])]}]));
  const [selectedId,setSelectedId]=useState("CLASS_MANAGER");
  const [saved,setSaved]=useState(initial);const [drafts,setDrafts]=useState(initial);
  const [busy,setBusy]=useState(false);const [notice,setNotice]=useState<{success:boolean;text:string}|null>(null);
  const entry=drafts[selectedId]; const isAdmin=entry.baseRole==="ADMIN";
  const changed=selectedId==="new" || JSON.stringify(entry)!==JSON.stringify(saved[selectedId]);
  const groups=[...new Set(permissionCatalog.map(item=>item.group))];
  function patch(values:Partial<Entry>){setDrafts(previous=>({...previous,[selectedId]:{...previous[selectedId],...values}}));}
  async function save(){
    if(isAdmin)return;setBusy(true);setNotice(null);
    try {
      const result=entry.builtIn ? await saveRolePolicy({role:entry.baseRole,version:entry.version,permissions:entry.permissions}) : await saveCustomRole({...(selectedId!=="new"?{id:entry.id}:{}),name:entry.name,baseRole:entry.baseRole,version:entry.version,permissions:entry.permissions});
      if(result.success){
        const id="id" in result && typeof result.id==="string"?result.id:entry.id;const next={...entry,id,version:result.version};
        setSaved(previous=>({...previous,[id]:next}));setDrafts(previous=>{const copy={...previous};delete copy.new;return {...copy,[id]:next};});setSelectedId(id);
        setNotice({success:true,text:"Đã lưu. Quyền mới có hiệu lực từ yêu cầu tiếp theo."});
      }else setNotice({success:false,text:result.error});
    }catch{setNotice({success:false,text:"Không thể lưu. Các lựa chọn vẫn được giữ."});}finally{setBusy(false);}
  }
  return <div className="grid items-start gap-5 lg:grid-cols-[minmax(250px,3fr)_minmax(0,7fr)]" data-slot="master-detail">
    <aside className="space-y-4 rounded-xl border bg-card p-4 lg:sticky lg:top-0" data-slot="master-pane" aria-label="Chọn vai trò">
      <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Vai trò</h2><Button disabled={busy} aria-label="Thêm vai trò" onClick={()=>{setDrafts(previous=>({...previous,new:previous.new || {id:"new",name:"",baseRole:"CLASS_MANAGER",version:0,permissions:["dashboard.view"]}}));setSelectedId("new");setNotice(null);}}><Plus/>Thêm</Button></div>
      <p className="text-sm text-muted-foreground">Chọn vai trò để xem và chỉnh quyền.</p>
      <div className="grid gap-3">{Object.values(drafts).map(item=><Button key={item.id} variant={selectedId===item.id?"default":"outline"} aria-pressed={selectedId===item.id} disabled={busy} className="h-auto min-h-14 justify-start whitespace-normal px-4 py-3 text-left" onClick={()=>{setSelectedId(item.id);setNotice(null);}}><ShieldCheck/>{item.name||"Vai trò mới"}{item.id==="ADMIN"&&<span className="ml-auto text-xs">Bảo vệ</span>}</Button>)}</div>
    </aside>
    <section className="min-w-0 space-y-4" data-slot="detail-pane" aria-label="Thiết lập quyền">
      <div className="space-y-4 rounded-xl border bg-card p-4"><h2 className="text-lg font-semibold">{entry.name||"Vai trò mới"}</h2>
        {!entry.builtIn && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="role-name">Tên vai trò</Label><Input id="role-name" maxLength={60} value={entry.name} disabled={busy} onChange={event=>patch({name:event.target.value})}/></div><div className="space-y-2"><Label htmlFor="role-base">Nghiệp vụ</Label><SelectField id="role-base" value={entry.baseRole} disabled={busy||selectedId!=="new"} onValueChange={value=>patch({baseRole:value as Role,permissions:["dashboard.view"]})}><SelectOption value="CLASS_MANAGER">Quản lý lớp</SelectOption><SelectOption value="ACCOUNTANT">Kế toán</SelectOption></SelectField></div></div>}
        <p className="text-sm leading-6">{isAdmin?"Quản trị luôn có toàn quyền và được bảo vệ.":entry.baseRole==="CLASS_MANAGER"?"Chỉ truy cập các lớp được phân công. Chọn các quyền nghiệp vụ cần cấp.":"Làm việc trên các lớp trong hệ thống theo quyền nghiệp vụ kế toán được cấp."} Mọi tài khoản đăng nhập đều xem được Tổng quan theo phạm vi dữ liệu của mình.</p>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">{groups.map(group=><fieldset key={group} className="rounded-xl border bg-card p-4"><legend className="px-2 text-base font-semibold">{group}</legend><div className="space-y-2">{permissionCatalog.filter(item=>item.group===group).map(item=>{
        const universal=item.key==="dashboard.view";
        const locked=isAdmin||universal||adminOnly(item.key)||!defaultRolePermissions[entry.baseRole].includes(item.key);
        return <label key={item.key} className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-sm ${entry.permissions.includes(item.key)?"border-blue-200 bg-blue-50":"border-transparent"} ${locked?"text-muted-foreground":"cursor-pointer hover:bg-muted"}`}><input type="checkbox" className="size-5 shrink-0 accent-blue-600" checked={entry.permissions.includes(item.key)} disabled={busy||locked} onChange={event=>patch({permissions:event.target.checked?withDependencies([...entry.permissions,item.key]):withoutDependents(entry.permissions,item.key)})}/><span className="flex-1">{item.label}</span>{locked&&<span className="text-xs">{universal?"Luôn có":isAdmin||adminOnly(item.key)?"Bảo vệ":"Ngoài phạm vi"}</span>}</label>;
      })}</div></fieldset>)}</div>
      <div className="space-y-3 rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Bật thao tác sẽ tự bật quyền xem cần thiết. Tắt quyền xem sẽ tắt các thao tác phụ thuộc.</p>{notice&&<p role="status" className={`text-sm ${notice.success?"text-emerald-700":"text-destructive"}`}>{notice.text}</p>}{!isAdmin&&<div className="flex justify-end gap-3"><Button variant="outline" disabled={busy||!changed||selectedId==="new"} onClick={()=>setDrafts(previous=>({...previous,[selectedId]:saved[selectedId]}))}>Hoàn tác</Button><Button loading={busy} disabled={busy||!changed||(!entry.builtIn&&!entry.name.trim())} onClick={()=>void save()}><Save/>{busy?"Đang lưu…":"Lưu"}</Button></div>}</div>
    </section>
  </div>;
}
