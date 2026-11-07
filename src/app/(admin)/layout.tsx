import {ssoEnabled} from "@/lib/auth-mode";
import {SsoSessionGuard} from "@/components/admin/sso-session-guard";
import {version} from "../../../package.json";
import type { ReactNode } from "react";
import { pageUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await pageUser();
  const profile=await prisma.user.findUnique({where:{id:actor.id},select:{email:true}});
  const shell = <AdminShell version={version} email={profile?.email||null} actor={actor}>{children}</AdminShell>;
  return ssoEnabled() ? <SsoSessionGuard>{shell}</SsoSessionGuard> : shell;
}
