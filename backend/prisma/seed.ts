import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ALL_STORAGES, SEED_SUMMARY, SEED_USER } from "./seed-data";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.user.deleteMany({ where: { email: SEED_USER.email } });

    const passwordHash = await bcrypt.hash(SEED_USER.password, 10);
    const user = await prisma.user.create({
      data: {
        email: SEED_USER.email,
        passwordHash,
        name: SEED_USER.name,
        storages: {
          create: ALL_STORAGES,
        },
      },
      include: {
        storages: {
          include: {
            _count: { select: { boxes: true } },
          },
        },
      },
    });

    console.log("\n=== Seed completed ===\n");
    console.log(`User:  ${user.email}`);
    console.log(`Pass:  ${SEED_USER.password}`);
    console.log(`Name:  ${user.name}`);
    console.log(`\nStorages (${user.storages.length}):`);
    for (const storage of user.storages) {
      console.log(`  - ${storage.name} (${storage._count.boxes} boxes)`);
    }
    console.log("\nSearch hints (storage «Демо: поиск и UI»):");
    for (const hint of SEED_SUMMARY.searchHints) {
      console.log(`  «${hint.query}» → ${hint.target}`);
    }
    console.log(`\nQR code for scanner: ${SEED_SUMMARY.qrCode}`);
    console.log("\nRe-run is safe: existing seed user is replaced.\n");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
