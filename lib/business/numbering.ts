import type { Prisma, PrismaClient } from "@prisma/client";

type NumberSequenceClient = PrismaClient | Prisma.TransactionClient;

/**
 * Reserves a short, human-readable number atomically.  Timestamps alone are
 * not unique when two checkouts or jobs run in the same second, so only the
 * later number for that prefix and second receives a tiny sequence suffix.
 */
export async function createBusinessNumber(client: NumberSequenceClient, prefix: string, now: Date = new Date()) {
  const stamp = now.toISOString().replace(/\D/g, "").slice(0, 14);
  const rows = await client.$queryRaw<{ sequence: number }[]>`
    INSERT INTO business_number_sequences (prefix, stamp, sequence)
    VALUES (${prefix}, ${stamp}, 1)
    ON CONFLICT (prefix, stamp)
    DO UPDATE SET sequence = business_number_sequences.sequence + 1
    RETURNING sequence
  `;
  const sequence = rows[0]?.sequence;
  if (!sequence) throw new Error("Could not reserve a business document number.");
  return sequence === 1 ? `${prefix}-${stamp}` : `${prefix}-${stamp}-${sequence}`;
}
