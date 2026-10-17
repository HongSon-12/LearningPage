import type { ReactNode } from "react";
import { pageUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await pageUser();
  return <AdminShell actor={actor}>{children}</AdminShell>;
}
