import { login } from "@/app/actions/auth";
export async function POST(request:Request) {
 if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({success:false,error:"Nguồn yêu cầu không hợp lệ."},{status:403});
 try{const result=await login(await request.formData());return Response.json(result,{status:result.success?200:401});}
 catch(error){console.error("Login failure",error);return Response.json({success:false,error:"Không thể đăng nhập. Vui lòng thử lại."},{status:500});}
}
