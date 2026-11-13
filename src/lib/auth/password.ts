// Loaded on first use, so processes that never hash passwords (the worker) do not need the native module.
const argon2 = () => import('@node-rs/argon2');

// argon2id with OWASP-recommended parameters (19 MiB memory, 2 iterations, 1 lane).
const OPTIONS = { algorithm: 2 as const, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const PASSWORD_MIN_LENGTH = 12;

export async function hashPassword(password: string): Promise<string> {
  return (await argon2()).hash(password, OPTIONS);
}

export async function verifyPassword(stored: string | null, password: string): Promise<boolean> {
  if (!stored) {
    // Spend the same effort when there is no account, so timing does not reveal which emails are registered.
    await (await argon2()).hash(password, OPTIONS);
    return false;
  }
  try {
    return await (await argon2()).verify(stored, password);
  } catch {
    return false;
  }
}
