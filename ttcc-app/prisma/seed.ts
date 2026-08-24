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
  console.log('Created default setting:', setting)

  // 2. Create Default Admin User (Password: admin123 -> you should hash this in real life)
  // We'll use a placeholder hash for now, assuming bcrypt is used later.
  // The actual hash for 'admin123' using bcrypt with 10 rounds is:
  // $2b$10$EP/k11Z66F/eD9G20X.tTu2y1X9jI03pD4D/6B.uE6YtJ5pB0lCUK
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: '$2b$10$EP/k11Z66F/eD9G20X.tTu2y1X9jI03pD4D/6B.uE6YtJ5pB0lCUK', // "admin123"
    },
  })
  console.log('Created default admin:', admin.username)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
