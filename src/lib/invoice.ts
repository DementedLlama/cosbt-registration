/**
 * Invoice number generator.
 * Format: COSBT-YYYY-NNNN (e.g. COSBT-2025-0001)
 *
 * Numbers are generated inside a SERIALIZABLE transaction so that two concurrent
 * requests can never read the same maximum and produce a duplicate invoice number.
 *
 * Room.invoiceNumber also has a @unique constraint as a final safety net at the
 * database level.
 */

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

/**
 * Generates the next unique invoice number for the given calendar year.
 *
 * Opens its own SERIALIZABLE transaction. Do NOT wrap this inside another
 * transaction — obtain the invoice number first, then write the Room record.
 */
export async function generateInvoiceNumber(year?: number): Promise<string> {
  const targetYear = year ?? new Date().getFullYear();
  const prefix = `COSBT-${targetYear}-`;

  return prisma.$transaction(
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
}
