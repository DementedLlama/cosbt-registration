-- Generated from prisma/schema.prisma via: npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
-- Run this in Neon SQL Editor if port 5432 is blocked locally.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VIEW_ONLY');
CREATE TYPE "PackageType" AS ENUM ('SINGLE', 'TWIN', 'TRIPLE');
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIAL');
CREATE TYPE "OccupantType" AS ENUM ('ADULT', 'CHILD_PRIMARY', 'CHILD_PRESCHOOL');
CREATE TYPE "BedType" AS ENUM ('CWB', 'CWOB', 'NOT_APPLICABLE');
CREATE TYPE "TransportMode" AS ENUM ('COACH', 'OWN_TRANSPORT');

CREATE TABLE "CampEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "registrationDeadline" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricingRubric" (
    "id" TEXT NOT NULL,
    "campEventId" TEXT NOT NULL,
    "singleAdultRate" DECIMAL(10,2) NOT NULL,
    "twinAdultRate" DECIMAL(10,2) NOT NULL,
    "tripleAdultRate" DECIMAL(10,2) NOT NULL,
    "singleStudentRate" DECIMAL(10,2) NOT NULL,
    "twinStudentRate" DECIMAL(10,2) NOT NULL,
    "tripleStudentRate" DECIMAL(10,2) NOT NULL,
    "childPrimaryRate" DECIMAL(10,2) NOT NULL,
    "extraBedRate" DECIMAL(10,2) NOT NULL,
    "preschoolRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "transportRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PricingRubric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEW_ONLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "campEventId" TEXT NOT NULL,
    "roomInChargeName" TEXT NOT NULL,
    "roomInChargeEmail" TEXT NOT NULL,
    "roomInChargeMobile" TEXT NOT NULL,
    "roomInChargeChurch" TEXT NOT NULL,
    "pdpaConsent" BOOLEAN NOT NULL,
    "pdpaConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "campEventId" TEXT NOT NULL,
    "packageType" "PackageType" NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "adminNotes" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Occupant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "nationality" TEXT NOT NULL,
    "passportNumber" TEXT NOT NULL,
    "passportExpiry" TIMESTAMP(3) NOT NULL,
    "occupantType" "OccupantType" NOT NULL,
    "isStudent" BOOLEAN NOT NULL DEFAULT false,
    "bedType" "BedType" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "transportMode" "TransportMode" NOT NULL DEFAULT 'OWN_TRANSPORT',
    "nokName" TEXT NOT NULL DEFAULT '',
    "nokContact" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Occupant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetTable" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "PricingRubric_campEventId_key" ON "PricingRubric"("campEventId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Registration_campEventId_idx" ON "Registration"("campEventId");
CREATE INDEX "Registration_roomInChargeEmail_idx" ON "Registration"("roomInChargeEmail");
CREATE UNIQUE INDEX "Room_invoiceNumber_key" ON "Room"("invoiceNumber");
CREATE INDEX "Room_registrationId_idx" ON "Room"("registrationId");
CREATE INDEX "Room_campEventId_idx" ON "Room"("campEventId");
CREATE INDEX "Room_paymentStatus_idx" ON "Room"("paymentStatus");
CREATE INDEX "Occupant_roomId_idx" ON "Occupant"("roomId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_targetTable_targetId_idx" ON "AuditLog"("targetTable", "targetId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Foreign Keys
ALTER TABLE "PricingRubric" ADD CONSTRAINT "PricingRubric_campEventId_fkey" FOREIGN KEY ("campEventId") REFERENCES "CampEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_campEventId_fkey" FOREIGN KEY ("campEventId") REFERENCES "CampEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_campEventId_fkey" FOREIGN KEY ("campEventId") REFERENCES "CampEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Occupant" ADD CONSTRAINT "Occupant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
