import { redirect } from "next/navigation";
import { pagePermission } from "@/lib/auth";
export default async function AssignmentsPage() {
  await pagePermission("classes.assign");
  redirect("/courses");
}
