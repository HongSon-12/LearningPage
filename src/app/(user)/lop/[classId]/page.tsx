import prisma from "@/lib/prisma";
import { occupiedWhere } from "@/lib/admissions";
import { notFound } from "next/navigation";
import ProgramLanding from "../../components/ProgramLanding";
export const dynamic="force-dynamic";
export default async function ClassLanding({params}:{params:Promise<{classId:string}>}) {
 const {classId}=await params; const course=await prisma.class.findUnique({where:{id:classId},include:{_count:{select:{registrations:{where:occupiedWhere}}}}});
 if(!course)notFound();return <ProgramLanding type={course.courseType} course={course}/>;
}
