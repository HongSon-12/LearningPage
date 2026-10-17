import { notFound } from "next/navigation";
import { programs, type ProgramType } from "@/lib/programs";
import ProgramLanding from "../../components/ProgramLanding";
export default async function ProgramPage({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;const type=(Object.keys(programs) as ProgramType[]).find(key=>programs[key].slug===slug);
 if(!type)notFound();return <ProgramLanding type={type}/>;
}
