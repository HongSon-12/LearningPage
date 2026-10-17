import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // 1. Create Default Setting
  const setting = await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      bankName: 'VietinBank',
      accountName: 'Trung tâm Cấp cứu 115 Thành phố Hồ Chí Minh',
      accountNumber: '117000119058',
      transferSyntax: 'CD2026 {CLASS_CODE} {PHONE}',
    },
  })
  console.log('Default setting ready:', setting.id)

  // Bootstrap only when explicitly provided; never create an account with a fixed password.
  const existing = await prisma.user.findUnique({where: {username: 'admin'}})
  if (!existing) {
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
    if (!password || password.length < 12 || password.length > 72) throw new Error('Set BOOTSTRAP_ADMIN_PASSWORD (12–72 characters), or run pnpm setup:admin.')
    const { hash } = await import('bcryptjs')
    await prisma.user.create({data: {username: 'admin', passwordHash: await hash(password, 12), role: 'ADMIN'}})
  }
  console.log('Admin ready; existing credentials preserved.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
