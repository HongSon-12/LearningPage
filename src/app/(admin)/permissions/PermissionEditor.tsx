"use client";
import { toast } from "sonner";
import { useState } from "react";
import { ShieldCheck, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { permissionCatalog, permissionKeys, type PermissionKey } from "@/lib/permission-catalog";
import { roleLabels } from "@/lib/user-input";
import { saveRolePolicy,saveCustomRole } from "@/app/actions/roles";
type Role="ADMIN"|"CLASS_MANAGER"|"ACCOUNTANT";
type Policy={version:number;permissions:PermissionKey[]};
type Entry=Policy & {id:string;name:string;baseRole:Role;builtIn?:boolean};
export default function PermissionEditor({policies,customRoles}:{policies:Record<Role,Policy>;customRoles:{id:string;name:string;baseRole:Role;version:number;permissions:PermissionKey[]}[]}) {
  const initial:Record<string,Entry>=Object.fromEntries([
    ...(["ADMIN","CLASS_MANAGER","ACCOUNTANT"] as const).map(role=>({id:role,name:roleLabels[role],baseRole:role,builtIn:true,...(policies[role]||{version:0,permissions:[]})})),...customRoles,
  ].map(item=>[item.id,{...item,permissions:[...new Set(item.permissions)]}]));
  const [selectedId,setSelectedId]=useState("CLASS_MANAGER");
  const [saved,setSaved]=useState(initial);const [drafts,setDrafts]=useState(initial);
  const [busy,setBusy]=useState(false);const [notice,setNotice]=useState<{success:boolean;text:string}|null>(null);
  const entry=drafts[selectedId];
  const changed=selectedId==="new" || JSON.stringify(entry)!==JSON.stringify(saved[selectedId]);
  const groups=[...new Set(permissionCatalog.map(item=>item.group))];
  function patch(values:Partial<Entry>){setDrafts(previous=>({...previous,[selectedId]:{...previous[selectedId],...values}}));}
  async function save(){
    setBusy(true);setNotice(null);
    try {
      const result=entry.builtIn ? await saveRolePolicy({role:entry.baseRole,version:entry.version,permissions:entry.permissions}) : await saveCustomRole({...(selectedId!=="new"?{id:entry.id}:{}),name:entry.name,version:entry.version,permissions:entry.permissions});
      if(result.success){
        const id="id" in result && typeof result.id==="string"?result.id:entry.id;const next={...entry,id,version:result.version};
        setSaved(previous=>({...previous,[id]:next}));setDrafts(previous=>{const copy={...previous};delete copy.new;return {...copy,[id]:next};});setSelectedId(id);
        toast.success("Đã lưu quyền. Quyền mới có hiệu lực từ yêu cầu tiếp theo.");
        setNotice({success:true,text:"Đã lưu. Quyền mới có hiệu lực từ yêu cầu tiếp theo."});
      }else {toast.error(result.error);setNotice({success:false,text:result.error});}
    }catch{toast.error("Không thể lưu. Các lựa chọn vẫn được giữ.");setNotice({success:false,text:"Không thể lưu. Các lựa chọn vẫn được giữ."});}finally{setBusy(false);}
  }
  return <div className="grid items-start gap-5 lg:grid-cols-[minmax(250px,3fr)_minmax(0,7fr)]" data-slot="master-detail">
    <aside className="space-y-4 rounded-xl border bg-card p-4 lg:sticky lg:top-0" data-slot="master-pane" aria-label="Chọn vai trò">
      <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Vai trò</h2><Button disabled={busy} aria-label="Thêm vai trò" onClick={()=>{setDrafts(previous=>({...previous,new:previous.new || {id:"new",name:"",baseRole:"ACCOUNTANT",version:0,permissions:[]}}));setSelectedId("new");setNotice(null);}}><Plus/>Thêm</Button></div>
      <p className="text-sm text-muted-foreground">Chọn vai trò để xem và chỉnh quyền.</p>
      <div className="grid gap-3">{Object.values(drafts).map(item=><Button key={item.id} variant={selectedId===item.id?"default":"outline"} aria-pressed={selectedId===item.id} disabled={busy} className="h-auto min-h-14 justify-start whitespace-normal px-4 py-3 text-left" onClick={()=>{setSelectedId(item.id);setNotice(null);}}><ShieldCheck/>{item.name||"Vai trò mới"}</Button>)}</div>
    </aside>
    <section className="min-w-0 space-y-4" data-slot="detail-pane" aria-label="Thiết lập quyền">
      <div className="space-y-4 rounded-xl border bg-card p-4"><h2 className="text-lg font-semibold">{entry.name||"Vai trò mới"}</h2>
        {!entry.builtIn && <div className="space-y-2"><Label htmlFor="role-name">Tên vai trò</Label><Input id="role-name" maxLength={60} value={entry.name} disabled={busy} onChange={event=>patch({name:event.target.value})}/></div>}
        <p className="text-sm leading-6">Chọn các quyền vai trò được sử dụng. Quyền truy cập tất cả lớp học quyết định phạm vi dữ liệu; nếu không chọn, tài khoản chỉ truy cập lớp được phân công.</p>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={()=>patch({permissions:[...permissionKeys]})}>Chọn tất cả</Button><Button variant="outline" disabled={busy} onClick={()=>patch({permissions:[]})}>Bỏ chọn tất cả</Button></div>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">{groups.map(group=><fieldset key={group} className="rounded-xl border bg-card p-4"><legend className="px-2 text-base font-semibold">{group}</legend><div className="space-y-2">{permissionCatalog.filter(item=>item.group===group).map(item=>{
        return <label key={item.key} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted ${entry.permissions.includes(item.key)?"border-blue-200 bg-blue-50":"border-transparent"}`}><input type="checkbox" className="size-5 shrink-0 accent-blue-600" checked={entry.permissions.includes(item.key)} disabled={busy} onChange={event=>patch({permissions:event.target.checked?[...entry.permissions,item.key]:entry.permissions.filter(key=>key!==item.key)})}/><span className="flex-1">{item.label}</span></label>;
      })}</div></fieldset>)}</div>
      <div className="space-y-3 rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Các quyền được bật/tắt độc lập và lưu đúng lựa chọn. Chọn quyền xem tương ứng nếu cần mở trang quản lý để sử dụng thao tác.</p>{notice&&<p role="status" className={`text-sm ${notice.success?"text-emerald-700":"text-destructive"}`}>{notice.text}</p>}<div className="flex justify-end gap-3"><Button variant="outline" disabled={busy||!changed||selectedId==="new"} onClick={()=>setDrafts(previous=>({...previous,[selectedId]:saved[selectedId]}))}>Hoàn tác</Button><Button loading={busy} disabled={busy||!changed||(!entry.builtIn&&!entry.name.trim())} onClick={()=>void save()}><Save/>{busy?"Đang lưu…":"Lưu"}</Button></div></div>
    </section>
  </div>;
}
