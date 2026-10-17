import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = `${process.env.DATABASE_URL}`

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool, {schema: process.env.DATABASE_SCHEMA || "public"})

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter })
}

declare global {
  var prismaSchemaVersion: string | undefined
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaSchemaVersion === "student-management-v1" ? globalThis.prismaGlobal ?? prismaClientSingleton() : prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') {globalThis.prismaGlobal = prisma; globalThis.prismaSchemaVersion = 'student-management-v1'}
