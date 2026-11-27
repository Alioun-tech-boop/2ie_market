import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { categorySchema, ORDER_STATUSES, SITES, slugify, updateCategorySchema } from '@2ie/shared'
import type { Prisma } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '../config'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { toAdminUser } from '../lib/dto'
import { HttpError } from '../lib/errors'
import { signedPrivateImageUrl, storeOptimizedImage } from '../lib/images'
import { listingReference } from '../lib/marketDto'
import { readMultipart } from '../lib/multipart'
import { getPlatformSettings, toPlatformDto } from '../lib/platform'
import { prisma } from '../lib/prisma'

function addOneMonth(from: Date): Date {
  const next = new Date(from)
  const day = next.getDate()
  next.setDate(1)
  next.setMonth(next.getMonth() + 1)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, lastDay))
  return next
}

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}

const listQuerySchema = z.object({ ...pagination })
const usersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['CLIENT', 'MERCHANT', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  ...pagination,
})
const listingsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED']).optional(),
  type: z.enum(['PHYSICAL', 'SECOND_HAND', 'SERVICE']).optional(),
  site: z.enum(SITES).optional(),
  featured: z.enum(['true', 'false']).optional(),
  ...pagination,
})
const ordersQuerySchema = z.object({
  q: z.string().trim().max(64).optional(),
  site: z.enum(SITES).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  ...pagination,
})
const reportsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['OPEN', 'RESOLVED', 'DISMISSED']).optional(),
  ...pagination,
})

const statusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) }).strict()
const roleSchema = z.object({ role: z.enum(['CLIENT', 'MERCHANT']) }).strict()
const moderationSchema = z.object({ action: z.enum(['HIDE', 'RESTORE', 'DELETE']) }).strict()
const featuredSchema = z.object({ featured: z.boolean() }).strict()
const reportUpdateSchema = z
  .object({
    status: z.enum(['RESOLVED', 'DISMISSED']),
    resolutionNote: z.string().trim().max(500).optional().nullable(),
  })
  .strict()
const settingsSchema = z
  .object({
    platformName: z.string().trim().min(2).max(120).optional(),
    supportEmail: z.string().trim().email('Adresse e-mail invalide.').max(160).optional().nullable(),
    maintenanceMessage: z.string().trim().max(500).optional().nullable(),
    reviewsEnabled: z.boolean().optional(),
  })
  .strict()

const idParamSchema = z.object({ id: z.string().uuid('Identifiant invalide.') })
const adminGuard = { preHandler: [authenticate, authorize('ADMIN')] }
const adminWriteGuard = {
  ...adminGuard,
  config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
}

const adminUserInclude = {
  location: true,
  store: { include: { location: true } },
  _count: {
    select: { orders: true, orderGroups: true, reviews: true, favorites: true, reports: true },
  },
} satisfies Prisma.UserInclude
type AdminUserRecord = Prisma.UserGetPayload<{ include: typeof adminUserInclude }>

const adminListingInclude = {
  photos: { take: 1, orderBy: { position: 'asc' as const } },
  category: { select: { id: true, name: true, slug: true } },
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      location: { select: { site: true } },
    },
  },
  _count: { select: { reports: true } },
} satisfies Prisma.ListingInclude
type AdminListingRecord = Prisma.ListingGetPayload<{ include: typeof adminListingInclude }>

const adminOrderGroupInclude = {
  client: { select: { id: true, firstName: true, lastName: true } },
  orders: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalCents: true,
      currency: true,
      store: { select: { id: true, name: true, slug: true, location: { select: { site: true } } } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.OrderGroupInclude
type AdminOrderGroupRecord = Prisma.OrderGroupGetPayload<{ include: typeof adminOrderGroupInclude }>

const adminReportInclude = {
  listing: {
    select: {
      id: true,
      title: true,
      status: true,
      store: { select: { id: true, name: true, slug: true } },
    },
  },
  reporter: { select: { id: true, firstName: true, lastName: true } },
  resolvedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ReportInclude
type AdminReportRecord = Prisma.ReportGetPayload<{ include: typeof adminReportInclude }>

const auditInclude = {
  actor: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.AuditLogInclude
type AuditRecord = Prisma.AuditLogGetPayload<{ include: typeof auditInclude }>

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  icon: true,
  position: true,
  isActive: true,
  parentId: true,
  parent: { select: { id: true, name: true, slug: true } },
  _count: {
    select: {
      listings: { where: { status: 'PUBLISHED', store: { isActive: true } } },
    },
  },
  createdAt: true,
} satisfies Prisma.CategorySelect

type CategoryRecord = Prisma.CategoryGetPayload<{ select: typeof categorySelect }>

type CategoryMeta = {
  name: string
  slug: string
  icon: string | null
  position: number
  isActive: boolean
  parentId: string | null
}

function toCategoryDto(category: CategoryRecord) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    position: category.position,
    isActive: category.isActive,
    parentId: category.parentId,
    parent: category.parent,
    count: category._count.listings,
    createdAt: category.createdAt,
  }
}

function categoryMeta(category: CategoryMeta) {
  return {
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    position: category.position,
    isActive: category.isActive,
    parentId: category.parentId,
  }
}

async function categoryWithCount(id: string) {
  const category = await prisma.category.findUnique({ where: { id }, select: categorySelect })
  if (!category) throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'Catégorie introuvable.')
  return toCategoryDto(category)
}

function toAdminUserDetail(user: AdminUserRecord, listingCount: number, reportsReceived: number) {
  return {
    ...toAdminUser(user),
    orders: user._count.orders,
    orderGroups: user._count.orderGroups,
    reviews: user._count.reviews,
    favorites: user._count.favorites,
    reports: user._count.reports,
    listings: listingCount,
    reportsReceived,
    store: user.store
      ? {
          id: user.store.id,
          name: user.store.name,
          slug: user.store.slug,
          isActive: user.store.isActive,
          site: user.store.location.site,
          createdAt: user.store.createdAt.toISOString(),
        }
      : null,
  }
}

function toAdminListing(listing: AdminListingRecord) {
  const photo = listing.photos[0]
  return {
    id: listing.id,
    reference: listingReference(listing.id),
    title: listing.title,
    type: listing.type,
    status: listing.status,
    priceCents: listing.priceCents,
    currency: listing.currency,
    availability: listing.availability,
    isFeatured: listing.isFeatured,
    viewsCount: listing.viewsCount,
    category: listing.category,
    store: {
      id: listing.store.id,
      name: listing.store.name,
      slug: listing.store.slug,
      isActive: listing.store.isActive,
      site: listing.store.location.site,
    },
    photo: photo ? { url: photo.url, thumbUrl: photo.thumbUrl ?? photo.url } : null,
    reports: listing._count.reports,
    createdAt: listing.createdAt.toISOString(),
    publishedAt: listing.publishedAt?.toISOString() ?? null,
  }
}

function toAdminOrderGroup(group: AdminOrderGroupRecord) {
  return {
    id: group.id,
    reference: group.reference,
    status: group.status,
    totalCents: group.totalCents,
    currency: group.currency,
    site: group.snapshotSite,
    deliveryMode: group.deliveryMode,
    client: group.client,
    createdAt: group.createdAt.toISOString(),
    orders: group.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalCents: order.totalCents,
      currency: order.currency,
      itemCount: order._count.items,
      store: {
        id: order.store.id,
        name: order.store.name,
        slug: order.store.slug,
        site: order.store.location.site,
      },
    })),
  }
}

function toAdminReport(report: AdminReportRecord) {
  return {
    id: report.id,
    reason: report.reason,
    details: report.details,
    status: report.status,
    resolutionNote: report.resolutionNote,
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
    createdAt: report.createdAt.toISOString(),
    listing: report.listing,
    reporter: report.reporter,
    resolvedBy: report.resolvedBy,
  }
}

function toAuditDto(entry: AuditRecord) {
  return {
    id: entry.id,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    meta: entry.meta,
    createdAt: entry.createdAt.toISOString(),
    actor: entry.actor,
  }
}

export async function adminRoutes(app: FastifyInstance) {
  app.get('/private-proofs/:filename', adminGuard, async (request, reply) => {
    const { filename } = z.object({
      filename: z.string().regex(/^[0-9a-f-]{36}\.(?:pdf|webp)$/i),
    }).parse(request.params)
    let data: Buffer
    try {
      data = await readFile(join(config.uploadsDir, 'seller-proofs', filename))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new HttpError(404, 'PROOF_NOT_FOUND', 'Justificatif introuvable.')
      }
      throw error
    }
    const contentType = filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/webp'
    return reply
      .header('Cache-Control', 'private, no-store')
      .header('X-Content-Type-Options', 'nosniff')
      .type(contentType)
      .send(data)
  })
  app.get('/merchant-applications', adminGuard, async () => {
    const stores = await prisma.store.findMany({
      where: { approvalStatus: { in: ['PENDING', 'REJECTED'] } },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true, phoneE164: true, createdAt: true } },
        location: { select: { site: true, buildingNumber: true, roomNumber: true, floor: true, reference: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return {
      applications: await Promise.all(stores.map(async (store) => ({
        id: store.id,
        status: store.approvalStatus,
        storeName: store.name,
        description: store.description,
        whatsapp: store.whatsappE164,
        paymentAmount: 1000,
        paymentProofUrl: await signedPrivateImageUrl(store.paymentProofUrl),
        reviewNote: store.reviewNote,
        createdAt: store.createdAt.toISOString(),
        owner: {
          id: store.owner.id,
          firstName: store.owner.firstName,
          lastName: store.owner.lastName,
          email: store.owner.email,
          phone: store.owner.phoneE164,
          createdAt: store.owner.createdAt.toISOString(),
        },
        location: store.location,
      }))),
    }
  })

  app.patch('/merchant-applications/:id', adminWriteGuard, async (request) => {
    const { id } = idParamSchema.parse(request.params)
    const payload = z.object({
      decision: z.enum(['APPROVE', 'REJECT']),
      note: z.string().trim().max(500).optional().nullable(),
    }).strict().parse(request.body)
    const store = await prisma.store.findUnique({ where: { id }, include: { owner: true } })
    if (!store) throw new HttpError(404, 'MERCHANT_APPLICATION_NOT_FOUND', 'Demande vendeur introuvable.')
    if (store.approvalStatus === 'APPROVED') {
      throw new HttpError(409, 'MERCHANT_ALREADY_APPROVED', 'Cette boutique est déjà validée.')
    }
    if (payload.decision === 'REJECT' && !payload.note?.trim()) {
      throw new HttpError(400, 'REJECTION_NOTE_REQUIRED', 'Indiquez le motif du refus.')
    }

    await prisma.$transaction(async (tx) => {
      const approved = payload.decision === 'APPROVE'
      if (approved && store.owner.role === 'ADMIN') {
        throw new HttpError(409, 'ADMIN_MERCHANT_CONFLICT', 'Un compte administrateur ne peut pas être converti en compte vendeur.')
      }
      const owner = await tx.user.findUniqueOrThrow({
        where: { id: store.ownerId },
        select: { status: true, role: true },
      })
      if (approved && owner.role === 'ADMIN') {
        throw new HttpError(409, 'ADMIN_MERCHANT_CONFLICT', 'Un compte administrateur ne peut pas être converti en compte vendeur.')
      }
      const changed = await tx.store.updateMany({
        where: { id, approvalStatus: store.approvalStatus },
        data: {
          approvalStatus: approved ? 'APPROVED' : 'REJECTED',
          isActive: approved && owner.status === 'ACTIVE',
          subscriptionExpiresAt: approved ? addOneMonth(new Date()) : null,
          lastSubscriptionReminderAt: null,
          reviewNote: payload.note?.trim() || null,
          reviewedAt: new Date(),
        },
      })
      if (changed.count !== 1) {
        throw new HttpError(409, 'MERCHANT_APPLICATION_REVIEWED', 'Cette demande a déjà été traitée.')
      }
      if (approved) {
        const promoted = await tx.user.updateMany({
          where: { id: store.ownerId, role: { not: 'ADMIN' } },
          data: { role: 'MERCHANT' },
        })
        if (promoted.count !== 1) {
          throw new HttpError(409, 'ADMIN_MERCHANT_CONFLICT', 'Le compte propriétaire ne peut pas être converti en vendeur.')
        }
      }
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: approved ? 'MERCHANT_APPLICATION_APPROVED' : 'MERCHANT_APPLICATION_REJECTED',
          targetType: 'Store',
          targetId: id,
          meta: { ownerId: store.ownerId, note: payload.note?.trim() || null, paymentAmount: 1000 },
        },
      })
    })
    return { ok: true, status: payload.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED' }
  })
  app.get('/overview', adminGuard, async () => {
    const [
      userGroups,
      listingGroups,
      orderGroups,
      reportGroups,
      stores,
      categories,
      featuredListings,
      orderGroupCount,
      gmv,
      siteStats,
      recentAudit,
    ] = await Promise.all([
      prisma.user.groupBy({ by: ['role', 'status'], _count: { _all: true } }),
      prisma.listing.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.store.count(),
      prisma.category.count(),
      prisma.listing.count({ where: { isFeatured: true } }),
      prisma.orderGroup.count(),
      prisma.order.aggregate({
        where: { status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'] } },
        _sum: { totalCents: true },
      }),
      Promise.all(
        SITES.map(async (site) => {
          const [users, listings, orders, siteGmv] = await Promise.all([
            prisma.user.count({ where: { location: { site } } }),
            prisma.listing.count({ where: { store: { location: { site } } } }),
            prisma.order.count({ where: { snapshotSite: site } }),
            prisma.order.aggregate({
              where: { snapshotSite: site, status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'] } },
              _sum: { totalCents: true },
            }),
          ])
          return {
            site,
            users,
            listings,
            orders,
            gmvCents: siteGmv._sum.totalCents ?? 0,
          }
        }),
      ),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: auditInclude,
      }),
    ])

    const usersByRole = (role: 'CLIENT' | 'MERCHANT' | 'ADMIN') =>
      userGroups.filter((row) => row.role === role).reduce((sum, row) => sum + row._count._all, 0)
    const usersByStatus = (status: 'ACTIVE' | 'SUSPENDED') =>
      userGroups.filter((row) => row.status === status).reduce((sum, row) => sum + row._count._all, 0)
    const listingsByStatus = (status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED') =>
      listingGroups.filter((row) => row.status === status).reduce((sum, row) => sum + row._count._all, 0)
    const ordersByStatus = (status: (typeof ORDER_STATUSES)[number]) =>
      orderGroups.filter((row) => row.status === status).reduce((sum, row) => sum + row._count._all, 0)
    const reportsByStatus = (status: 'OPEN' | 'RESOLVED' | 'DISMISSED') =>
      reportGroups.filter((row) => row.status === status).reduce((sum, row) => sum + row._count._all, 0)

    return {
      stats: {
        users: userGroups.reduce((sum, row) => sum + row._count._all, 0),
        activeUsers: usersByStatus('ACTIVE'),
        suspendedUsers: usersByStatus('SUSPENDED'),
        clients: usersByRole('CLIENT'),
        merchants: usersByRole('MERCHANT'),
        admins: usersByRole('ADMIN'),
        stores,
        categories,
        listings: listingGroups.reduce((sum, row) => sum + row._count._all, 0),
        publishedListings: listingsByStatus('PUBLISHED'),
        pausedListings: listingsByStatus('PAUSED'),
        archivedListings: listingsByStatus('ARCHIVED'),
        featuredListings,
        orderGroups: orderGroupCount,
        orders: orderGroups.reduce((sum, row) => sum + row._count._all, 0),
        pendingOrders: ordersByStatus('PENDING'),
        completedOrders: ordersByStatus('COMPLETED'),
        cancelledOrders: ordersByStatus('CANCELLED'),
        gmvCents: gmv._sum.totalCents ?? 0,
        reports: reportGroups.reduce((sum, row) => sum + row._count._all, 0),
        openReports: reportsByStatus('OPEN'),
        resolvedReports: reportsByStatus('RESOLVED'),
        dismissedReports: reportsByStatus('DISMISSED'),
      },
      bySite: siteStats,
      byStatus: ORDER_STATUSES.map((status) => ({ status, count: ordersByStatus(status) })),
      recentAudit: recentAudit.map(toAuditDto),
    }
  })

  app.get('/users', adminGuard, async (request) => {
    const { q, role, status, page, limit } = usersQuerySchema.parse(request.query)
    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phoneE164: { contains: q } },
            ],
          }
        : {}),
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: adminUserInclude,
      }),
      prisma.user.count({ where }),
    ])

    return {
      users: users.map(toAdminUser),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  })

  app.get('/users/:id', adminGuard, async (request) => {
    const { id } = idParamSchema.parse(request.params)
    const user = await prisma.user.findUnique({ where: { id }, include: adminUserInclude })
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.')

    const [listingCount, reportsReceived] = await Promise.all([
      user.store ? prisma.listing.count({ where: { storeId: user.store.id } }) : Promise.resolve(0),
      user.store
        ? prisma.report.count({ where: { listing: { is: { storeId: user.store.id } } } })
        : Promise.resolve(0),
    ])

    return { user: toAdminUserDetail(user, listingCount, reportsReceived) }
  })

  app.patch('/users/:id/status', adminWriteGuard, async (request) => {
    const { id } = idParamSchema.parse(request.params)
    const { status } = statusSchema.parse(request.body)

    if (id === request.user!.id) {
      throw new HttpError(400, 'SELF_SUSPENSION', 'Vous ne pouvez pas modifier votre propre statut.')
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) throw new HttpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.')
    if (target.role === 'ADMIN') {
      throw new HttpError(403, 'ADMIN_STATUS_PROTECTED', 'Le statut d’un administrateur ne peut pas être modifié via cette API.')
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Contrôle atomique du rôle : une promotion concurrente en ADMIN ne
      // peut pas être suivie d'une suspension via cette route.
      const changed = await tx.user.updateMany({
        where: { id, role: { not: 'ADMIN' } },
        data: { status },
      })
      if (changed.count !== 1) {
        throw new HttpError(403, 'ADMIN_STATUS_PROTECTED', 'Le statut d’un administrateur ne peut pas être modifié via cette API.')
      }
      const user = await tx.user.findUniqueOrThrow({ where: { id } })
      if (status === 'SUSPENDED') {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      }
      if (user.role === 'MERCHANT') {
        // La boutique ne peut être réactivée que si le compte et la validation
        // administrative sont tous deux actifs.
        const store = await tx.store.findUnique({ where: { ownerId: id }, select: { id: true, approvalStatus: true } })
        if (store) {
          await tx.store.update({
            where: { id: store.id },
            data: { isActive: status === 'ACTIVE' && store.approvalStatus === 'APPROVED' },
          })
        }
      }
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
          targetType: 'User',
          targetId: id,
          meta: { previousStatus: target.status },
        },
      })
      return user
    })

    return { user: { id: updated.id, status: updated.status } }
  })

  app.patch('/users/:id/role', adminWriteGuard, async (request) => {
    const { id } = idParamSchema.parse(request.params)
    const { role } = roleSchema.parse(request.body)

    if (id === request.user!.id) {
      throw new HttpError(400, 'SELF_ROLE_CHANGE', 'Vous ne pouvez pas modifier votre propre rôle.')
    }

    const target = await prisma.user.findUnique({ where: { id }, include: { store: true } })
    if (!target) throw new HttpError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.')
    if (target.role === 'ADMIN') {
      throw new HttpError(403, 'ADMIN_ROLE_PROTECTED', 'Le rôle administrateur ne peut pas être modifié via cette API.')
    }
    if (target.role === role) {
      throw new HttpError(400, 'ROLE_UNCHANGED', 'Ce compte possède déjà ce rôle.')
    }
    if (role === 'MERCHANT' && !target.store) {
      throw new HttpError(
        409,
        'STORE_REQUIRED',
        'Ce compte ne possède pas de boutique : créez une boutique avant de le promouvoir commerçant.',
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id, role: target.role },
        data: { role },
      })
      if (changed.count !== 1) {
        throw new HttpError(409, 'USER_ROLE_CHANGED', 'Le rôle de cet utilisateur a changé. Actualisez la page.')
      }
      const user = await tx.user.findUniqueOrThrow({ where: { id } })

      if (target.store) {
        if (role === 'MERCHANT') {
          if (target.store.approvalStatus !== 'APPROVED') {
            throw new HttpError(403, 'MERCHANT_NOT_APPROVED', 'La demande vendeur doit être validée avant l’activation du rôle.')
          }
          await tx.store.update({ where: { id: target.store.id }, data: { isActive: true } })
        } else {
          await tx.store.update({ where: { id: target.store.id }, data: { isActive: false } })
          await tx.listing.updateMany({
            where: { storeId: target.store.id, status: 'PUBLISHED' },
            data: { status: 'PAUSED' },
          })
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: 'USER_ROLE_CHANGED',
          targetType: 'User',
          targetId: id,
          meta: { previousRole: target.role, newRole: role },
        },
      })
      return user
    })

    return { user: { id: updated.id, role: updated.role } }
  })

  app.get('/listings', adminGuard, async (request) => {
    const { q, status, type, site, featured, page, limit } = listingsQuerySchema.parse(request.query)
    const where: Prisma.ListingWhereInput = {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(site ? { store: { location: { site } } } : {}),
      ...(featured ? { isFeatured: featured === 'true' } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { store: { name: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const [listings, total] = await prisma.$transaction([
      prisma.listing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        include: adminListingInclude,
      }),
      prisma.listing.count({ where }),
    ])

    return {
      listings: listings.map(toAdminListing),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  })

  app.patch('/listings/:id/moderation', adminWriteGuard, async (request) => {
    const { id } = idParamSchema.parse(request.params)
    const { action } = moderationSchema.parse(request.body)
    const listing = await prisma.listing.findUnique({ where: { id }, select: { id: true, status: true } })
    if (!listing) throw new HttpError(404, 'LISTING_NOT_FOUND', 'Annonce introuvable.')

    const data =
      action === 'HIDE'
        ? { status: 'PAUSED' as const, isFeatured: false, featuredAt: null }
        : action === 'RESTORE'
          ? { status: 'PUBLISHED' as const, publishedAt: new Date() }
          : { status: 'ARCHIVED' as const, isFeatured: false, featuredAt: null }

    await prisma.$transaction([
      prisma.listing.update({ where: { id }, data }),
      prisma.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: action === 'HIDE' ? 'LISTING_HIDDEN' : action === 'RESTORE' ? 'LISTING_RESTORED' : 'LISTING_ARCHIVED',
          targetType: 'Listing',
          targetId: id,
          meta: { previousStatus: listing.status, newStatus: data.status },
        },
      }),
    ])

    return { ok: true, status: data.status }
  })

  app.patch('/listings/:id/featured', adminWriteGuard, async (request) => {
    const { id } = idParamSchema.parse(request.params)
    const { featured } = featuredSchema.parse(request.body)
    const listing = await prisma.listing.findUnique({ where: { id }, select: { id: true, isFeatured: true } })
    if (!listing) throw new HttpError(404, 'LISTING_NOT_FOUND', 'Annonce introuvable.')

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.listing.update({
        where: { id },
        data: { isFeatured: featured, featuredAt: featured ? new Date() : null },
        select: { id: true, isFeatured: true },
      })
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: featured ? 'LISTING_FEATURED' : 'LISTING_UNFEATURED',
          targetType: 'Listing',
          targetId: id,
          meta: { previous: listing.isFeatured, next: featured },
        },
      })
      return result
    })

    return { listing: updated }
  })

  app.get('/orders', adminGuard, async (request) => {
    const { q, site, status, page, limit } = ordersQuerySchema.parse(request.query)
    const where: Prisma.OrderGroupWhereInput = {
      ...(q ? { reference: { contains: q, mode: 'insensitive' } } : {}),
      ...(site ? { snapshotSite: site } : {}),
      ...(status ? { orders: { some: { status } } } : {}),
    }

    const [groups, total, pending, completed, gmv] = await Promise.all([
      prisma.orderGroup.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: adminOrderGroupInclude,
      }),
      prisma.orderGroup.count({ where }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.aggregate({
        where: { status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'] } },
        _sum: { totalCents: true },
      }),
    ])

    return {
      groups: groups.map(toAdminOrderGroup),
      stats: {
        pending,
        completed,
        gmvCents: gmv._sum.totalCents ?? 0,
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  })

  app.get('/reports', adminGuard, async (request) => {
    const { q, status, page, limit } = reportsQuerySchema.parse(request.query)
    const where: Prisma.ReportWhereInput = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { details: { contains: q, mode: 'insensitive' } },
              { listing: { is: { title: { contains: q, mode: 'insensitive' } } } },
              {
                reporter: {
                  is: {
                    OR: [
                      { firstName: { contains: q, mode: 'insensitive' } },
                      { lastName: { contains: q, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    }

    const [reports, total] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: adminReportInclude,
      }),
      prisma.report.count({ where }),
    ])

    return {
      reports: reports.map(toAdminReport),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  })

  app.patch('/reports/:id', adminWriteGuard, async (request) => {
    const { id } = idParamSchema.parse(request.params)
    const payload = reportUpdateSchema.parse(request.body)
    const existing = await prisma.report.findUnique({ where: { id } })
    if (!existing) throw new HttpError(404, 'REPORT_NOT_FOUND', 'Signalement introuvable.')

    const updated = await prisma.$transaction(async (tx) => {
      const report = await tx.report.update({
        where: { id },
        data: {
          status: payload.status,
          resolutionNote: payload.resolutionNote ?? null,
          resolvedById: request.user!.id,
          resolvedAt: new Date(),
        },
        include: adminReportInclude,
      })
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: payload.status === 'RESOLVED' ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
          targetType: 'Report',
          targetId: id,
          meta: { previousStatus: existing.status, note: payload.resolutionNote ?? null },
        },
      })
      return report
    })

    return { report: toAdminReport(updated) }
  })

  app.get('/settings', adminGuard, async () => {
    const settings = await getPlatformSettings()
    return { settings: toPlatformDto(settings) }
  })

  app.patch('/settings', adminWriteGuard, async (request) => {
    const payload = settingsSchema.parse(request.body)
    await getPlatformSettings()
    const settings = await prisma.$transaction(async (tx) => {
      const updated = await tx.platformSettings.update({
        where: { id: 'default' },
        data: {
          ...(payload.platformName !== undefined ? { platformName: payload.platformName } : {}),
          ...(payload.supportEmail !== undefined ? { supportEmail: payload.supportEmail } : {}),
          ...(payload.maintenanceMessage !== undefined
            ? { maintenanceMessage: payload.maintenanceMessage }
            : {}),
          ...(payload.reviewsEnabled !== undefined ? { reviewsEnabled: payload.reviewsEnabled } : {}),
          updatedById: request.user!.id,
        },
      })
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: 'PLATFORM_SETTINGS_UPDATED',
          targetType: 'PlatformSettings',
          targetId: null,
          meta: payload,
        },
      })
      return updated
    })

    return { settings: toPlatformDto(settings) }
  })

  app.post('/settings/logo', adminWriteGuard, async (request) => {
    const { files } = await readMultipart(request, 1)
    const file = files[0]
    if (!file) throw new HttpError(400, 'FILE_REQUIRED', 'Sélectionnez un logo.')

    const image = await storeOptimizedImage(file.buffer, file.mimetype)
    await getPlatformSettings()
    const settings = await prisma.$transaction(async (tx) => {
      const updated = await tx.platformSettings.update({
        where: { id: 'default' },
        data: { logoUrl: image.url, updatedById: request.user!.id },
      })
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: 'PLATFORM_LOGO_UPDATED',
          targetType: 'PlatformSettings',
          meta: { logoUrl: image.url },
        },
      })
      return updated
    })

    return { settings: toPlatformDto(settings) }
  })

  app.delete('/settings/logo', adminWriteGuard, async (request) => {
    await getPlatformSettings()
    const settings = await prisma.$transaction(async (tx) => {
      const updated = await tx.platformSettings.update({
        where: { id: 'default' },
        data: { logoUrl: null, updatedById: request.user!.id },
      })
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: 'PLATFORM_LOGO_REMOVED',
          targetType: 'PlatformSettings',
        },
      })
      return updated
    })

    return { settings: toPlatformDto(settings) }
  })

  app.get('/audit', adminGuard, async (request) => {
    const { page, limit } = listQuerySchema.parse(request.query)
    const [entries, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: auditInclude,
      }),
      prisma.auditLog.count(),
    ])

    return {
      entries: entries.map(toAuditDto),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  })

  app.get('/categories', adminGuard, async () => {
    const categories = await prisma.category.findMany({
      select: categorySelect,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    })
    return { categories: categories.map(toCategoryDto) }
  })

  app.post('/categories', adminWriteGuard, async (request) => {
    const payload = categorySchema.parse(request.body)
    const slug = payload.slug ?? slugify(payload.name)

    if (await prisma.category.findUnique({ where: { slug }, select: { id: true } })) {
      throw new HttpError(409, 'CONFLICT', 'Ce slug est déjà utilisé.')
    }

    const created = await prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: {
          name: payload.name,
          slug,
          icon: payload.icon,
          position: payload.position,
          isActive: payload.isActive,
          parentId: payload.parentId,
        },
      })
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: 'CATEGORY_CREATED',
          targetType: 'Category',
          targetId: category.id,
          meta: categoryMeta(category),
        },
      })
      return category
    })

    return { category: await categoryWithCount(created.id) }
  })

  app.patch('/categories/:id', adminWriteGuard, async (request) => {
    const { id } = idParamSchema.parse(request.params)
    const payload = updateCategorySchema.parse(request.body)

    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'Catégorie introuvable.')

    if (payload.slug !== undefined && payload.slug !== existing.slug) {
      if (await prisma.category.findUnique({ where: { slug: payload.slug }, select: { id: true } })) {
        throw new HttpError(409, 'CONFLICT', 'Ce slug est déjà utilisé.')
      }
    }

    if (payload.parentId === id) {
      throw new HttpError(400, 'INVALID_PARENT', 'Une catégorie ne peut pas être son propre parent.')
    }

    const previous = categoryMeta(existing)
    await prisma.$transaction(async (tx) => {
      await tx.category.update({ where: { id }, data: payload })
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: 'CATEGORY_UPDATED',
          targetType: 'Category',
          targetId: id,
          meta: previous,
        },
      })
    })

    return { category: await categoryWithCount(id) }
  })

  app.delete('/categories/:id', adminWriteGuard, async (request) => {
    const { id } = idParamSchema.parse(request.params)

    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'Catégorie introuvable.')

    const previous = categoryMeta(existing)
    await prisma.$transaction(async (tx) => {
      await tx.category.update({ where: { id }, data: { isActive: false } })
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: 'CATEGORY_ARCHIVED',
          targetType: 'Category',
          targetId: id,
          meta: previous,
        },
      })
    })

    return { ok: true }
  })
}
