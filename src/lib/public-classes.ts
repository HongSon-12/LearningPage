import prisma from "./prisma";
import { occupiedWhere } from "./admissions";
const select = { id: true, courseType: true, code: true, name: true, courseBatch: true, fee: true, location: true, startDate: true, endDate: true, startTime: true, endTime: true, registrationDeadline: true, totalLessons: true, targetAudiences: true, certificateType: true, capacity: true, status: true, _count: { select: { registrations: { where: occupiedWhere } } } } as const;
async function readClasses() { return prisma.class.findMany({ where: { status: "OPEN" }, select, orderBy: [{ startDate: "asc" }, { id: "asc" }] }); }
type Courses = Awaited<ReturnType<typeof readClasses>>;
declare global {
    var ttccPublicClasses: Map<string, {
        promise: Promise<Courses>;
        expires: number;
    }> | undefined;
}
const entries: NonNullable<typeof globalThis.ttccPublicClasses> = globalThis.ttccPublicClasses ??= new Map();
const key = () => process.env.DATABASE_SCHEMA || "public";
// Only public class metadata/counts; never cache sessions, identities or private documents.
// Single-flight also coalesces a burst of requests on each app instance.
export function publicClasses() {
    const namespace = key(), existing = entries.get(namespace);
    if (existing && existing.expires > Date.now())
        return existing.promise;
    const promise = readClasses();
    const entry = { promise, expires: Number.POSITIVE_INFINITY };
    entries.set(namespace, entry);
    void promise.then(() => { entry.expires = Date.now() + 10000; }, () => {
        if (entries.get(namespace) === entry)
            entries.delete(namespace);
    });
    return promise;
}
export function invalidatePublicClasses() { entries.delete(key()); availabilityEntries.delete(key()); }

async function readAvailability() {
    const courses = await prisma.class.findMany({
        where: { status: "OPEN" },
        select: { id: true, capacity: true, _count: { select: { registrations: { where: occupiedWhere } } } },
        orderBy: [{ startDate: "asc" }, { id: "asc" }],
    });
    return courses.map(course => ({ id: course.id, capacity: course.capacity, count: course._count.registrations }));
}
type Availability = Awaited<ReturnType<typeof readAvailability>>;
type AvailabilityCache = Map<string, { promise: Promise<Availability>; expires: number }>;
declare global { var ttccPublicAvailability: AvailabilityCache | undefined; }
const availabilityEntries = globalThis.ttccPublicAvailability ??= new Map() as AvailabilityCache;
export function publicClassAvailability() {
    const namespace = key(), existing = availabilityEntries.get(namespace);
    if (existing && existing.expires > Date.now()) return existing.promise;
    const entry = { promise: readAvailability(), expires: Number.POSITIVE_INFINITY };
    availabilityEntries.set(namespace, entry);
    void entry.promise.then(() => { entry.expires = Date.now() + 10000; }, () => {
        if (availabilityEntries.get(namespace) === entry) availabilityEntries.delete(namespace);
    });
    return entry.promise;
}
