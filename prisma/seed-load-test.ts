/**
 * Load test seed script — inserts 250 registrations with realistic data.
 *
 * Prerequisites:
 *   - Local Postgres running (docker compose up -d)
 *   - At least one CampEvent exists (run seed.ts first, then create an event via admin UI)
 *   - ENCRYPTION_KEY set in .env.local
 *
 * Run with:
 *   source .env.local && DATABASE_URL="postgresql://cosbt:cosbt@localhost:5432/cosbt_camp" npx tsx prisma/seed-load-test.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createCipheriv, randomBytes } from "crypto";

// ── Config ──────────────────────────────────────────────────────────────────
const TOTAL_REGISTRATIONS = 250;
const YEAR = 2026;

// ── Prisma client ───────────────────────────────────────────────────────────
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

const adapter = new PrismaPg({ connectionString: databaseUrl });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

// ── Encryption (inline to avoid Next.js import issues) ──────────────────────
function encrypt(plaintext: string): string {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error(`ENCRYPTION_KEY must be 32 bytes. Got ${key.length}.`);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

// ── Random data helpers ─────────────────────────────────────────────────────
const FIRST_NAMES = [
  "Wei Ming", "Jia Yi", "Xin Yi", "Jun Wei", "Hui Ling", "Kai Xuan", "Li Hua",
  "Mei Ling", "Zhi Wei", "Shu Min", "Cheng Wei", "Yu Ting", "Jian Ming", "Xiao Wen",
  "Ah Kow", "Boon Huat", "Siew Lan", "Kim Hock", "Pei Shan", "Wai Keat",
  "David", "Sarah", "Michael", "Grace", "Jonathan", "Rachel", "Daniel", "Hannah",
  "Joshua", "Ruth", "Samuel", "Esther", "Timothy", "Priscilla", "Andrew", "Rebecca",
  "John", "Mary", "Peter", "Elizabeth", "James", "Jennifer", "Mark", "Sharon",
  "Luke", "Catherine", "Paul", "Christine", "Matthew", "Angela",
];

const LAST_NAMES = [
  "Tan", "Lim", "Lee", "Ng", "Ong", "Wong", "Goh", "Chua", "Chan", "Koh",
  "Teo", "Ang", "Yeo", "Ho", "Low", "Sim", "Tay", "Foo", "Lau", "Chong",
  "Wee", "Pang", "Soh", "Chew", "Heng", "Seah", "Quek", "Yap", "Chin", "Chia",
];

const CHURCHES = [
  "COSBT", "COSBT", "COSBT", "COSBT", "COSBT", // weighted toward COSBT
  "COSML", "COSTQ", "COSMC", "Grace Assembly", "Bethesda Bedok-Tampines",
  "Covenant EFC", "Trinity Christian Centre", "New Creation Church",
];

const NATIONALITIES = [
  "Singapore", "Singapore", "Singapore", "Singapore", "Singapore", // weighted
  "Malaysia", "Malaysia", "Indonesia", "China", "India",
  "Philippines", "South Korea", "Australia", "United States", "United Kingdom",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function randomEmail(name: string, index: number): string {
  const clean = name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "");
  return `${clean}.${index}@example.com`;
}

function randomMobile(): string {
  const prefix = Math.random() > 0.5 ? "9" : "8";
  return `${prefix}${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
}

function randomPassport(nationality: string): string {
  if (nationality === "Singapore") {
    const letter = Math.random() > 0.5 ? "S" : "T";
    return `${letter}${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
  }
  return `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String(Math.floor(Math.random() * 100000000)).padStart(8, "0")}`;
}

function randomDate(startYear: number, endYear: number): Date {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start));
}

function randomDob(type: "ADULT" | "CHILD_PRIMARY" | "CHILD_PRESCHOOL"): Date {
  if (type === "ADULT") return randomDate(1960, 2005);
  if (type === "CHILD_PRIMARY") return randomDate(2014, 2019);
  return randomDate(2020, 2024);
}

function randomPassportExpiry(): Date {
  return randomDate(2027, 2035);
}

type OccupantType = "ADULT" | "CHILD_PRIMARY" | "CHILD_PRESCHOOL";
type BedType = "CWB" | "CWOB" | "NOT_APPLICABLE";
type TransportMode = "COACH" | "OWN_TRANSPORT";
type PackageType = "SINGLE" | "TWIN" | "TRIPLE";
type PaymentStatus = "UNPAID" | "PAID" | "PARTIAL";

interface OccupantData {
  fullName: string;
  dateOfBirth: Date;
  nationality: string;
  passportNumber: string;
  passportExpiry: Date;
  occupantType: OccupantType;
  isStudent: boolean;
  bedType: BedType;
  transportMode: TransportMode;
}

// ── Pricing rates (matching typical COSBT rates) ────────────────────────────
const RATES = {
  singleAdultRate: 450,
  twinAdultRate: 350,
  tripleAdultRate: 300,
  singleStudentRate: 400,
  twinStudentRate: 300,
  tripleStudentRate: 250,
  childPrimaryRate: 150,
  extraBedRate: 80,
  preschoolRate: 0,
  transportRate: 25,
};

function calculateTotal(occupants: OccupantData[], packageType: PackageType): number {
  let total = 0;
  let hasCwb = false;
  for (const o of occupants) {
    if (o.occupantType === "ADULT") {
      const isStudent = o.isStudent;
      if (packageType === "SINGLE") total += isStudent ? RATES.singleStudentRate : RATES.singleAdultRate;
      else if (packageType === "TWIN") total += isStudent ? RATES.twinStudentRate : RATES.twinAdultRate;
      else total += isStudent ? RATES.tripleStudentRate : RATES.tripleAdultRate;
    } else if (o.occupantType === "CHILD_PRIMARY") {
      total += RATES.childPrimaryRate;
      if (o.bedType === "CWB" && !hasCwb) { total += RATES.extraBedRate; hasCwb = true; }
    } else {
      // CHILD_PRESCHOOL — free, but CWB still charged
      if (o.bedType === "CWB" && !hasCwb) { total += RATES.extraBedRate; hasCwb = true; }
    }
    if (o.transportMode === "COACH") total += RATES.transportRate;
  }
  return total;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // Find active event
  const event = await prisma.campEvent.findFirst({ where: { isActive: true } });
  if (!event) throw new Error("No active CampEvent found. Create one first.");

  console.log(`[load-test] Using event: "${event.name}" (${event.id})`);

  // Ensure pricing rubric exists
  let pricing = await prisma.pricingRubric.findUnique({ where: { campEventId: event.id } });
  if (!pricing) {
    pricing = await prisma.pricingRubric.create({
      data: { campEventId: event.id, ...RATES },
    });
    console.log(`[load-test] Created PricingRubric for event`);
  } else {
    console.log(`[load-test] PricingRubric already exists`);
  }

  // Check existing registration count
  const existingCount = await prisma.room.count({ where: { campEventId: event.id } });
  console.log(`[load-test] Existing rooms: ${existingCount}`);

  // Find highest existing invoice number for the year
  const prefix = `COSBT-${YEAR}-`;
  const lastRoom = await prisma.room.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  let nextSeq = 1;
  if (lastRoom) {
    const parts = lastRoom.invoiceNumber.split("-");
    nextSeq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  console.log(`[load-test] Starting invoice sequence at ${prefix}${String(nextSeq).padStart(4, "0")}`);
  console.log(`[load-test] Inserting ${TOTAL_REGISTRATIONS} registrations...`);

  const startTime = Date.now();
  let inserted = 0;
  const BATCH_SIZE = 25;

  for (let batch = 0; batch < Math.ceil(TOTAL_REGISTRATIONS / BATCH_SIZE); batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_REGISTRATIONS);

    // Build batch of registrations as a single transaction
    await prisma.$transaction(async (tx) => {
      for (let i = batchStart; i < batchEnd; i++) {
        // Decide room composition
        const roll = Math.random();
        let adultCount: number;
        if (roll < 0.25) adultCount = 1;       // 25% single
        else if (roll < 0.75) adultCount = 2;   // 50% twin
        else adultCount = 3;                     // 25% triple

        const childCount = Math.random() < 0.3 ? Math.floor(Math.random() * 2) + 1 : 0;

        const packageType: PackageType =
          adultCount === 1 ? "SINGLE" : adultCount === 2 ? "TWIN" : "TRIPLE";

        // Generate occupants
        const occupants: OccupantData[] = [];
        for (let a = 0; a < adultCount; a++) {
          const nat = pick(NATIONALITIES);
          const isStudent = Math.random() < 0.15; // 15% students
          occupants.push({
            fullName: randomName(),
            dateOfBirth: randomDob("ADULT"),
            nationality: nat,
            passportNumber: randomPassport(nat),
            passportExpiry: randomPassportExpiry(),
            occupantType: "ADULT",
            isStudent,
            bedType: "NOT_APPLICABLE",
            transportMode: Math.random() < 0.7 ? "COACH" : "OWN_TRANSPORT",
          });
        }

        let cwbUsed = false;
        for (let c = 0; c < childCount; c++) {
          const childType: OccupantType = Math.random() < 0.6 ? "CHILD_PRIMARY" : "CHILD_PRESCHOOL";
          const nat = occupants[0].nationality; // same nationality as first adult
          let bedType: BedType = "CWOB";
          if (!cwbUsed && Math.random() < 0.4) {
            bedType = "CWB";
            cwbUsed = true;
          }
          occupants.push({
            fullName: randomName(),
            dateOfBirth: randomDob(childType),
            nationality: nat,
            passportNumber: randomPassport(nat),
            passportExpiry: randomPassportExpiry(),
            occupantType: childType,
            isStudent: false,
            bedType,
            transportMode: Math.random() < 0.7 ? "COACH" : "OWN_TRANSPORT",
          });
        }

        const totalAmount = calculateTotal(occupants, packageType);
        const invoiceNumber = `${prefix}${String(nextSeq++).padStart(4, "0")}`;
        const roomIcName = occupants[0].fullName;

        // Payment status distribution: 40% UNPAID, 45% PAID, 15% PARTIAL
        const statusRoll = Math.random();
        const paymentStatus: PaymentStatus =
          statusRoll < 0.4 ? "UNPAID" : statusRoll < 0.85 ? "PAID" : "PARTIAL";

        // Create Registration -> Room -> Occupants
        await tx.registration.create({
          data: {
            campEventId: event.id,
            roomInChargeName: roomIcName,
            roomInChargeEmail: randomEmail(roomIcName, i),
            roomInChargeMobile: randomMobile(),
            roomInChargeChurch: pick(CHURCHES),
            pdpaConsent: true,
            pdpaConsentAt: new Date(),
            rooms: {
              create: {
                campEventId: event.id,
                packageType,
                invoiceNumber,
                paymentStatus,
                totalAmount,
                occupants: {
                  create: occupants.map((o) => ({
                    fullName: o.fullName,
                    dateOfBirth: o.dateOfBirth,
                    nationality: o.nationality,
                    passportNumber: encrypt(o.passportNumber),
                    passportExpiry: o.passportExpiry,
                    occupantType: o.occupantType,
                    isStudent: o.isStudent,
                    bedType: o.bedType,
                    transportMode: o.transportMode,
                  })),
                },
              },
            },
          },
        });

        inserted++;
      }
    });

    console.log(`[load-test] Batch ${batch + 1}: inserted ${batchEnd} / ${TOTAL_REGISTRATIONS}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[load-test] Done. Inserted ${inserted} registrations in ${elapsed}s`);

  // Summary stats
  const totalRooms = await prisma.room.count({ where: { campEventId: event.id } });
  const totalOccupants = await prisma.occupant.count();
  const paidCount = await prisma.room.count({ where: { campEventId: event.id, paymentStatus: "PAID" } });
  const unpaidCount = await prisma.room.count({ where: { campEventId: event.id, paymentStatus: "UNPAID" } });
  const partialCount = await prisma.room.count({ where: { campEventId: event.id, paymentStatus: "PARTIAL" } });

  console.log(`\n[load-test] Summary:`);
  console.log(`  Rooms:     ${totalRooms}`);
  console.log(`  Occupants: ${totalOccupants}`);
  console.log(`  Paid:      ${paidCount}`);
  console.log(`  Unpaid:    ${unpaidCount}`);
  console.log(`  Partial:   ${partialCount}`);
}

main()
  .catch((e) => {
    console.error("[load-test] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
