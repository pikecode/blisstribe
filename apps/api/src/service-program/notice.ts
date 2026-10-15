import { Prisma } from '@prisma/client'

export async function recordServiceNotice(tx: Prisma.TransactionClient, data: { eventKey: string; userId: bigint; title: string; detail: string; path: string }) {
  await tx.serviceNotice.upsert({ where: { eventKey: data.eventKey }, update: {}, create: data })
}
