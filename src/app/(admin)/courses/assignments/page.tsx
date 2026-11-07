import { redirect } from "next/navigation";
import { pageUser } from "@/lib/auth";
export default async function AssignmentsPage() {
  await pageUser(["ADMIN"]);
  redirect("/courses");
}
