import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { config } from '../config'
import { HttpError } from './errors'

export interface StoredImage {
  url: string
  thumbUrl: string
  width: number
  height: number
  bytes: number
}

const ALLOWED_MIME = new Map([
  ['image/jpeg', 'jpeg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

function storageIsConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey && config.supabaseStorageBucket)
}

async function uploadToSupabase(filename: string, data: Buffer): Promise<string> {
  const bucket = encodeURIComponent(config.supabaseStorageBucket)
  const objectPath = encodeURIComponent(filename)
  const endpoint = `${config.supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        'Content-Type': 'image/webp',
        'x-upsert': 'false',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body: new Uint8Array(data),
    })
  } catch {
    throw new HttpError(502, 'STORAGE_UNAVAILABLE', 'Le stockage des images est momentanément indisponible.')
  }

  if (!response.ok) {
    // Ne jamais renvoyer au navigateur la réponse brute du fournisseur (elle peut contenir des détails internes).
    throw new HttpError(502, 'STORAGE_UPLOAD_FAILED', 'L’image n’a pas pu être enregistrée. Vérifiez la configuration du stockage.')
  }

  return `${config.supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
}

/**
 * Convertit les images en WebP sans métadonnées, génère une vignette,
 * puis les conserve dans Supabase Storage en production. Le disque local
 * reste réservé au développement : le disque éphémère de Render ne convient
 * pas à la conservation des photos de profils, logos et annonces.
 */
export async function storeOptimizedImage(input: Buffer, mimetype: string): Promise<StoredImage> {
  if (!ALLOWED_MIME.has(mimetype)) {
    throw new HttpError(415, 'INVALID_IMAGE', 'Formats acceptés : JPEG, PNG ou WebP.')
  }
  if (input.byteLength > config.maxPhotoBytes) {
    throw new HttpError(413, 'FILE_TOO_LARGE', 'L’image ne doit pas dépasser 2 Mo.')
  }

  try {
    const source = sharp(input, {
      failOn: 'error',
      limitInputPixels: 40_000_000,
    }).rotate()

    const main = await source
      .clone()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true })

    const thumb = await source
      .clone()
      .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72, effort: 4 })
      .toBuffer()

    const filename = `${randomUUID()}.webp`
    const thumbFilename = `thumb-${filename}`

    let url: string
    let thumbUrl: string

    if (storageIsConfigured()) {
      ;[url, thumbUrl] = await Promise.all([
        uploadToSupabase(filename, main.data),
        uploadToSupabase(thumbFilename, thumb),
      ])
    } else {
      if (config.nodeEnv === 'production') {
        throw new HttpError(503, 'STORAGE_NOT_CONFIGURED', 'Le stockage permanent des images n’est pas encore configuré.')
      }
      await mkdir(config.uploadsDir, { recursive: true })
      await Promise.all([
        writeFile(join(config.uploadsDir, filename), main.data),
        writeFile(join(config.uploadsDir, thumbFilename), thumb),
      ])
      url = `/uploads/${filename}`
      thumbUrl = `/uploads/${thumbFilename}`
    }

    return {
      url,
      thumbUrl,
      width: main.info.width,
      height: main.info.height,
      bytes: main.info.size,
    }
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(415, 'INVALID_IMAGE', 'Image illisible ou corrompue.')
  }
}


/** Stocke un justificatif dans un bucket privé et renvoie uniquement sa clé interne. */
export async function storePrivateImage(input: Buffer, mimetype: string): Promise<string> {
  if (!ALLOWED_MIME.has(mimetype)) {
    throw new HttpError(415, 'INVALID_IMAGE', 'Formats acceptés : JPEG, PNG ou WebP.')
  }
  if (input.byteLength > config.maxPhotoBytes) {
    throw new HttpError(413, 'FILE_TOO_LARGE', 'Le justificatif ne doit pas dépasser 2 Mo.')
  }
  try {
    const image = await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer()
    const filename = `seller-proofs/${randomUUID()}.webp`
    if (storageIsConfigured()) {
      const bucket = encodeURIComponent(config.supabasePrivateBucket)
      const objectPath = filename.split('/').map(encodeURIComponent).join('/')
      const response = await fetch(`${config.supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
        method: 'POST',
        headers: {
          apikey: config.supabaseServiceRoleKey,
          Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
          'Content-Type': 'image/webp',
          'x-upsert': 'false',
        },
        body: new Uint8Array(image),
      })
      if (!response.ok) throw new HttpError(502, 'STORAGE_UPLOAD_FAILED', 'Le justificatif n’a pas pu être enregistré.')
      return filename
    }
    if (config.nodeEnv === 'production') {
      throw new HttpError(503, 'STORAGE_NOT_CONFIGURED', 'Le stockage privé des justificatifs n’est pas configuré.')
    }
    await mkdir(join(config.uploadsDir, 'seller-proofs'), { recursive: true })
    await writeFile(join(config.uploadsDir, filename), image)
    return `/uploads/${filename}`
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(415, 'INVALID_IMAGE', 'Image illisible ou corrompue.')
  }
}

/** Génère une URL signée courte pour qu'un administrateur consulte un justificatif privé. */
export async function signedPrivateImageUrl(objectPath: string | null): Promise<string | null> {
  if (!objectPath) return null
  if (/^https?:\\/\\//i.test(objectPath) || objectPath.startsWith('/uploads/')) return objectPath
  const bucket = encodeURIComponent(config.supabasePrivateBucket)
  const path = objectPath.split('/').map(encodeURIComponent).join('/')
  let response: Response
  try {
    response = await fetch(`${config.supabaseUrl}/storage/v1/object/sign/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 600 }),
    })
  } catch {
    throw new HttpError(502, 'STORAGE_UNAVAILABLE', 'Le justificatif est temporairement inaccessible.')
  }
  if (!response.ok) throw new HttpError(502, 'STORAGE_SIGN_FAILED', 'Impossible de générer le lien sécurisé du justificatif.')
  const data = await response.json() as { signedURL?: string }
  if (!data.signedURL) throw new HttpError(502, 'STORAGE_SIGN_FAILED', 'Le lien sécurisé du justificatif est invalide.')
  return `${config.supabaseUrl}/storage/v1${data.signedURL.startsWith('/') ? data.signedURL : `/${data.signedURL}`}`
}
