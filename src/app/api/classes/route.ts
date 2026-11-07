import { publicClasses } from "@/lib/public-classes";
export async function GET(){
 const courses=await publicClasses();
 return Response.json(courses.map(c=>({id:c.id,capacity:c.capacity,count:c._count.registrations})),{headers:{"Cache-Control":"no-store"}});
}
