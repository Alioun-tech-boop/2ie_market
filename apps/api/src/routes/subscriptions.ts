import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { HttpError } from '../lib/errors'
import { readMultipart } from '../lib/multipart'
import { signedPrivateImageUrl, storePrivateImage } from '../lib/images'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'

const idParam = z.object({ id: z.string().uuid() })
const PRICE = 1000

function addOneMonth(from: Date): Date {
  const next = new Date(from)
  const day = next.getDate()
  next.setDate(1)
  next.setMonth(next.getMonth() + 1)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, lastDay))
  return next
}

export async function subscriptionRoutes(app: FastifyInstance) {
  const merchantGuard = { preHandler: [authenticate, authorize('MERCHANT')] }
  const adminGuard = { preHandler: [authenticate, authorize('ADMIN')] }

  app.get('/me/subscription', merchantGuard, async (request) => {
    const store = await prisma.store.findUnique({
      where: { ownerId: request.user!.id },
      select: { id: true, approvalStatus: true, subscriptionExpiresAt: true },
    })
    if (!store || store.approvalStatus !== 'APPROVED') {
      throw new HttpError(403, 'MERCHANT_NOT_APPROVED', 'Votre boutique doit être validée avant de gérer son abonnement.')
    }
    const pending = await prisma.merchantSubscriptionPayment.findFirst({
      where: { storeId: store.id, status: 'PENDING' },
      select: { id: true, submittedAt: true },
      orderBy: { submittedAt: 'desc' },
    })
    return {
      amount: PRICE,
      expiresAt: store.subscriptionExpiresAt?.toISOString() ?? null,
      pending: pending ? { submittedAt: pending.submittedAt.toISOString() } : null,
      expired: !store.subscriptionExpiresAt || store.subscriptionExpiresAt <= new Date(),
    }
  })

  app.post('/me/subscription/renewal', merchantGuard, async (request, reply) => {
    const store = await prisma.store.findUnique({
      where: { ownerId: request.user!.id },
      select: { id: true, approvalStatus: true },
    })
    if (!store || store.approvalStatus !== 'APPROVED') {
      throw new HttpError(403, 'MERCHANT_NOT_APPROVED', 'Votre boutique doit être validée avant le renouvellement.')
    }
    const { files } = await readMultipart(request, 1)
    const proof = files[0]
    if (!proof) throw new HttpError(400, 'PAYMENT_PROOF_REQUIRED', 'Téléversez la preuve de paiement de 1 000 FCFA.')
    const existing = await prisma.merchantSubscriptionPayment.findFirst({
      where: { storeId: store.id, status: 'PENDING' },
      select: { id: true },
    })
    if (existing) throw new HttpError(409, 'SUBSCRIPTION_PAYMENT_PENDING', 'Votre preuve est déjà en cours de vérification.')
    const proofPath = await storePrivateImage(proof.buffer, proof.mimetype)
    const payment = await prisma.merchantSubscriptionPayment.create({
      data: { storeId: store.id, amount: PRICE, proofPath },
      select: { id: true, submittedAt: true },
    })
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } })
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map(({ id }) => ({
          userId: id,
          type: 'SUBSCRIPTION_PAYMENT_SUBMITTED',
          payload: { storeId: store.id, paymentId: payment.id, amount: PRICE },
        })),
      })
    }
    return reply.code(201).send({ ok: true, submittedAt: payment.submittedAt.toISOString() })
  })

  app.get('/admin/subscription-renewals', adminGuard, async () => {
    const payments = await prisma.merchantSubscriptionPayment.findMany({
      where: { status: 'PENDING' },
      include: {
        store: {
          include: {
            owner: { select: { id: true, firstName: true, lastName: true, email: true, phoneE164: true, status: true } },
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
    })
    const overdue = await prisma.store.findMany({
      where: { approvalStatus: 'APPROVED', subscriptionExpiresAt: { lte: new Date() } },
      include: { owner: { select: { id: true, firstName: true, lastName: true, email: true, phoneE164: true } } },
      orderBy: { subscriptionExpiresAt: 'asc' },
    })
    return {
      renewals: await Promise.all(payments.map(async (payment) => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        submittedAt: payment.submittedAt.toISOString(),
        proofUrl: await signedPrivateImageUrl(payment.proofPath),
        store: {
          id: payment.store.id,
          name: payment.store.name,
          expiresAt: payment.store.subscriptionExpiresAt?.toISOString() ?? null,
          owner: payment.store.owner,
        },
      }))),
      overdue: overdue.map((store) => ({
        id: store.id,
        name: store.name,
        expiresAt: store.subscriptionExpiresAt!.toISOString(),
        owner: store.owner,
      })),
    }
  })

  app.patch('/admin/subscription-renewals/:id', { ...adminGuard, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request) => {
    const { id } = idParam.parse(request.params)
    const payload = z.object({
      decision: z.enum(['APPROVE', 'REJECT']),
      note: z.string().trim().max(500).optional().nullable(),
    }).strict().parse(request.body)
    if (payload.decision === 'REJECT' && !payload.note?.trim()) {
      throw new HttpError(400, 'REJECTION_NOTE_REQUIRED', 'Indiquez le motif du refus.')
    }
    const payment = await prisma.merchantSubscriptionPayment.findUnique({
      where: { id },
      include: { store: { include: { owner: true } } },
    })
    if (!payment) throw new HttpError(404, 'SUBSCRIPTION_PAYMENT_NOT_FOUND', 'Renouvellement introuvable.')
    if (payment.status !== 'PENDING') throw new HttpError(409, 'SUBSCRIPTION_PAYMENT_REVIEWED', 'Ce renouvellement a déjà été traité.')
    const approved = payload.decision === 'APPROVE'
    const now = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.merchantSubscriptionPayment.update({
        where: { id },
        data: { status: approved ? 'APPROVED' : 'REJECTED', reviewNote: payload.note?.trim() || null, reviewedAt: now },
      })
      if (approved) {
        const base = payment.store.subscriptionExpiresAt && payment.store.subscriptionExpiresAt > now
          ? payment.store.subscriptionExpiresAt
          : now
        await tx.store.update({
          where: { id: payment.storeId },
          data: {
            subscriptionExpiresAt: addOneMonth(base),
            lastSubscriptionReminderAt: null,
            isActive: payment.store.owner.status === 'ACTIVE',
          },
        })
      }
      await tx.notification.create({
        data: {
          userId: payment.store.ownerId,
          type: approved ? 'SUBSCRIPTION_PAYMENT_APPROVED' : 'SUBSCRIPTION_PAYMENT_REJECTED',
          payload: { storeId: payment.storeId, amount: payment.amount, note: payload.note?.trim() || '' },
        },
      })
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: approved ? 'MERCHANT_SUBSCRIPTION_APPROVED' : 'MERCHANT_SUBSCRIPTION_REJECTED',
          targetType: 'MerchantSubscriptionPayment',
          targetId: id,
          meta: { storeId: payment.storeId, amount: payment.amount, note: payload.note?.trim() || null },
        },
      })
    })
    return { ok: true, status: approved ? 'APPROVED' : 'REJECTED' }
  })
}
