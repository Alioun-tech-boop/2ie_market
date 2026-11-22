import type { FastifyRequest } from 'fastify'
import { config } from '../config'

export interface UploadedFile {
  buffer: Buffer
  mimetype: string
  filename: string
}

/** Lit un formulaire multipart en bornant strictement champs et fichiers. */
export async function readMultipart(
  request: FastifyRequest,
  maxFiles = config.maxPhotosPerListing,
): Promise<{ fields: Record<string, string>; files: UploadedFile[] }> {
  const fields: Record<string, string> = {}
  const files: UploadedFile[] = []

  for await (const part of request.parts({
    limits: {
      fileSize: config.maxPhotoBytes,
      files: maxFiles,
      fields: 30,
      parts: maxFiles + 30,
    },
  })) {
    if (part.type === 'file') {
      if (part.fieldname !== 'photos') {
        await part.file.resume()
        continue
      }
      files.push({
        buffer: await part.toBuffer(),
        mimetype: part.mimetype,
        filename: part.filename,
      })
    } else {
      fields[part.fieldname] = String(part.value ?? '')
    }
  }

  return { fields, files }
}

export function parseJsonField<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
