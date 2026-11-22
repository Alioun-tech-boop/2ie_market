import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
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

/**
 * Normalise une image en WebP (métadonnées supprimées, EXIF inclus), produit une vignette
 * et stocke les deux fichiers sous un nom UUID. Aucun fichier d'origine n'est conservé.
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

    await Promise.all([
      writeFile(join(config.uploadsDir, filename), main.data),
      writeFile(join(config.uploadsDir, thumbFilename), thumb),
    ])

    return {
      url: `/uploads/${filename}`,
      thumbUrl: `/uploads/${thumbFilename}`,
      width: main.info.width,
      height: main.info.height,
      bytes: main.info.size,
    }
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(415, 'INVALID_IMAGE', 'Image illisible ou corrompue.')
  }
}
