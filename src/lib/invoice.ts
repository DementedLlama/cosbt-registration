/**
 * Invoice number generator.
 * Format: COSBT-YYYY-NNNN (e.g. COSBT-2025-0001)
 *
 * Numbers are generated inside a SERIALIZABLE transaction so that two concurrent
 * requests can never read the same maximum and produce a duplicate invoice number.
 * If the transaction hits a serialization failure, it retries up to MAX_RETRIES times.
 *
 * Room.invoiceNumber also has a @unique constraint as a final safety net at the
 * database level.
 */

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

const MAX_RETRIES = 3;

/**
 * Returns true if the error is a PostgreSQL serialization failure (40001)
 * or a Prisma unique constraint violation (P2002) on invoiceNumber.
 */
function isRetryableInvoiceError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: unique constraint violation (invoiceNumber collision)
    if (err.code === "P2002") return true;
  }
  // PostgreSQL serialization_failure (SQLSTATE 40001) — surfaces as generic error
  const msg = err instanceof Error ? err.message : "";
  if (msg.includes("could not serialize access")) return true;
  return false;
}

/**
 * Generates the next unique invoice number for the given calendar year.
 *
 * Retries on serialization failures and unique constraint violations.
 * Opens its own SERIALIZABLE transaction. Do NOT wrap this inside another
 * transaction — obtain the invoice number first, then write the Room record.
 */
export async function generateInvoiceNumber(year?: number): Promise<string> {
  const targetYear = year ?? new Date().getFullYear();
  const prefix = `COSBT-${targetYear}-`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // Find the highest existing invoice number for this year.
          // String descending works because the suffix is zero-padded to 4 digits.
          const lastRoom = await tx.room.findFirst({
            where: { invoiceNumber: { startsWith: prefix } },
            orderBy: { invoiceNumber: "desc" },
            select: { invoiceNumber: true },
          });

          let nextSeq = 1;
          if (lastRoom) {
            // Format: COSBT-YYYY-NNNN → split gives ["COSBT", "YYYY", "NNNN"]
            const parts = lastRoom.invoiceNumber.split("-");
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) {
              nextSeq = lastSeq + 1;
            }
          }

          const padded = String(nextSeq).padStart(4, "0");
          return `${prefix}${padded}`;
        },
        // SERIALIZABLE prevents two concurrent transactions from reading the same
        // maximum and generating a duplicate invoice number.
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (err) {
      if (isRetryableInvoiceError(err) && attempt < MAX_RETRIES) {
        continue;
      }
      throw err;
    }
  }

  // Unreachable — loop always returns or throws
  throw new Error("Invoice generation failed after retries");
}
