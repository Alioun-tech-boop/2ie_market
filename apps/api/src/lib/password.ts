import { hash, verify } from '@node-rs/argon2'

// Argon2id : recommandation OWASP (19 Mo, 2 passes, 32 octets).
const options = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, options)
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password, options)
  } catch {
    return false
  }
}
