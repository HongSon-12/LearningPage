import prisma from "@/lib/prisma";
import { occupiedWhere } from "@/lib/admissions";
export async function GET() {
 const courses=await prisma.class.findMany({where:{status:"OPEN"},select:{id:true,capacity:true,_count:{select:{registrations:{where:occupiedWhere}}}}});
 return Response.json(courses.map(c=>({id:c.id,capacity:c.capacity,count:c._count.registrations})),{headers:{"Cache-Control":"no-store"}});
}
