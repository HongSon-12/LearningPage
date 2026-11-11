import { z } from "zod";
import prisma from "./prisma";
import { rosterTransaction } from "./admissions";
import { ssoConfig } from "./sso-config";
import { randomBytes, createHash } from "node:crypto";
export const directoryUserSchema = z.object({
  pk: z.number().int().positive(), uid: z.string().regex(/^[a-f0-9]{64}$/i), username: z.string().min(1).max(150),
  name: z.string().trim().max(500).optional(),
  email: z.union([z.email().max(254), z.literal("")]), is_active: z.boolean(),
  type: z.string(), last_updated: z.iso.datetime({ offset: true }),
});
export type DirectoryUser = z.infer<typeof directoryUserSchema>;
export class SsoNotFound extends Error {}
const apiReads = new Map<string, Promise<unknown>>();
export async function ssoApi(path: string) {
  const token = process.env.SSO_API_TOKEN;
  if (!token) throw Error("SSO_API_TOKEN_REQUIRED");
  const base = new URL("/api/v3/", ssoConfig().issuer), url = new URL(path, base);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw Error("SSO_API_PATH_INVALID");
  const key = `${url.href}:${createHash("sha256").update(token).digest("hex")}`;
  const existing = apiReads.get(key);
  if (existing) return existing;
  const pending = (async () => {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (response.status === 404) throw new SsoNotFound();
  if (!response.ok) throw Error("SSO_API_UNAVAILABLE");
  const text = await response.text();
  if (Buffer.byteLength(text) > 2 * 1024 * 1024) throw Error("SSO_API_RESPONSE_TOO_LARGE");
  return JSON.parse(text) as unknown;
  })();
  apiReads.set(key, pending);
  const clear = () => { if (apiReads.get(key) === pending) apiReads.delete(key); };
  void pending.then(clear, clear);
  return pending;
}
export async function directoryUserById(id: string) {
  if (!/^[0-9]{1,16}$/.test(id)) throw Error("SSO_USER_ID_INVALID");
  return directoryUserSchema.parse(await ssoApi(`core/users/${id}/`));
}
export async function directoryUserByUsername(username: string) {
  const page = z.object({ results: z.array(directoryUserSchema) }).parse(await ssoApi(`core/users/?username=${encodeURIComponent(username)}&include_groups=false&include_roles=false&page_size=2`));
  if (page.results.length !== 1 || page.results[0].username !== username) throw Error("SSO_IDENTITY_NOT_FOUND");
  return page.results[0];
}
/** Authentik evaluates EDU application bindings for this specific user, independently of is_active. */
export async function ssoApplicationAllowed(userId: string) {
  if (!/^[0-9]{1,16}$/.test(userId)) throw Error("SSO_USER_ID_INVALID");
  const slug = new URL(ssoConfig().issuer).pathname.split("/").filter(Boolean).at(-1);
  if (!slug) throw Error("SSO_APPLICATION_INVALID");
  const page = z.object({ results: z.array(z.object({ slug: z.string() })) }).parse(
    await ssoApi(`core/applications/?slug=${encodeURIComponent(slug)}&for_user=${encodeURIComponent(userId)}&page_size=2`),
  );
  if (page.results.some(app => app.slug !== slug) || page.results.length > 1) throw Error("SSO_APPLICATION_RESPONSE_INVALID");
  return page.results.some(app => app.slug === slug);
}
export async function syncDirectoryUser(input: DirectoryUser) {
  const source = directoryUserSchema.parse(input), issuer = ssoConfig().issuer;
  if (!["internal", "external"].includes(source.type)) return null;
  const snapshot = await prisma.user.findUnique({where:{ssoUserId:String(source.pk)}});
  const normalizedEmail = source.email.trim().toLowerCase() || null;
  const granted = await ssoApplicationAllowed(String(source.pk));
  const active = source.is_active && granted;
  const checkedAt = new Date();
  // Most lease checks observe unchanged directory data: avoid a write/global management lock.
  if(snapshot?.ssoIssuer === issuer && snapshot.ssoUid === source.uid && snapshot.ssoUpdatedAt?.getTime() === new Date(source.last_updated).getTime() && snapshot.name === (source.name || null) && snapshot.ssoAccessCheckedAt && snapshot.appAccessGranted === granted && snapshot.username === source.username && snapshot.email === normalizedEmail && snapshot.ssoActive === source.is_active && snapshot.active === active) return snapshot;
  return rosterTransaction(async tx => {
    const existing = await tx.user.findUnique({ where: { ssoUserId: String(source.pk) } });
    if (existing && (existing.ssoIssuer !== issuer || existing.ssoUid !== source.uid)) throw Error("SSO_IDENTITY_CONFLICT");
    if (existing?.ssoUpdatedAt && existing.ssoUpdatedAt > new Date(source.last_updated)) {
      const user = await tx.user.update({where:{id:existing.id},data:{appAccessGranted:granted,ssoAccessCheckedAt:checkedAt,active:existing.ssoActive && granted}});
      if (!user.active) await tx.session.deleteMany({where:{userId:user.id}});
      return user;
    }
    const email = source.email.trim().toLowerCase() || null;
    const collision = await tx.user.findFirst({ where: { ...(existing ? { id: { not: existing.id } } : {}), OR: [{ username: source.username }, ...(email ? [{ email }] : [])] } });
    if (collision) throw Error("SSO_IDENTITY_CONFLICT");
    const user = await tx.user.upsert({ where: { ssoUserId: String(source.pk) }, create: {
      username: source.username, name: source.name || null, email, ssoIssuer: issuer, ssoUserId: String(source.pk), ssoUid: source.uid,
      ssoActive: source.is_active, ssoUpdatedAt: new Date(source.last_updated), appAccessGranted: granted, ssoAccessCheckedAt:checkedAt, active,
      role: null, passwordHash: `!sso:${randomBytes(32).toString("hex")}`,
    }, update: { appAccessGranted: granted, ssoAccessCheckedAt:checkedAt, username: source.username, name: source.name || null, email, ssoActive: source.is_active, ssoUpdatedAt: new Date(source.last_updated), active } });
    if (!active) await tx.session.deleteMany({ where: { userId: user.id } });
    return user;
  });
}
export async function syncAllSsoUsers(apply = false) {
  const users: DirectoryUser[] = [], seen = new Set<number>();
  // Small pages keep bulk sync within the shared SSO API's five-second timeout.
  for (let page = 1; page <= 1000; page++) {
    const response = z.object({ pagination: z.object({ current: z.number(), next: z.number().nullable(), total_pages: z.number(), count: z.number() }), results: z.array(directoryUserSchema) }).parse(await ssoApi(`core/users/?page=${page}&page_size=25&include_groups=false&include_roles=false`));
    if (response.pagination.current !== page) throw Error("SSO_PAGINATION_INVALID");
    for (const user of response.results) { if (seen.has(user.pk)) throw Error("SSO_PAGINATION_INVALID"); seen.add(user.pk); users.push(user); }
    if (!response.pagination.next) { if (users.length !== response.pagination.count) throw Error("SSO_PAGINATION_INCOMPLETE"); break; }
    if (response.pagination.next !== page + 1 || page === 1000) throw Error("SSO_PAGINATION_INVALID");
  }
  let synced = 0, conflicts = 0, skipped = 0;
  for (const user of users) {
    if (!["internal", "external"].includes(user.type)) { skipped++; continue; }
    if (apply) { try { await syncDirectoryUser(user); synced++; } catch { conflicts++; } }
  }
  return { total: users.length, synced, conflicts, skipped, applied: apply };
}
