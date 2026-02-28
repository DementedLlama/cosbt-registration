/**
 * Prisma seed script.
 * Creates a default SUPER_ADMIN account for first-time setup.
 *
 * Run with: npx prisma db seed
 *
 * Change the password below BEFORE running in production!
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

const adapter = new PrismaPg({ connectionString: databaseUrl });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const defaultEmail = "admin@cosbt.org.sg";
  const defaultPassword = "ChangeMe@123!"; // CHANGE THIS before production

  const existing = await prisma.user.findUnique({
    where: { email: defaultEmail },
  });

  if (existing) {
    console.log(`[seed] Super admin already exists: ${defaultEmail}`);
    return;
  }

  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  const user = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: defaultEmail,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log(`[seed] Created SUPER_ADMIN: ${user.email}`);
  console.log(`[seed] Temporary password: ${defaultPassword}`);
  console.log(`[seed] ⚠️  Please change this password immediately!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
