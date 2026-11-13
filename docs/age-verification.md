# Age verification

Every player must be 18 or over. This is not optional: never remove or weaken the check (see `AGENTS.md`).

## What the template does

At sign-up the player gives their date of birth. `isAdult` in `src/lib/auth/age.ts` works out their age on today's
date in the UK calendar and refuses anyone under 18. Checkout checks again (`playBlockReason`), so an account
without a valid adult date of birth cannot buy.

This is a self-declared check (`age_check_method = 'self_declared'`). It meets the minimum of asking for and checking a
date of birth, but it does not prove age. Check prize winners' age before paying out.

## Adding a third-party provider

The hook is the `AgeVerifier` interface:

```ts
interface AgeVerifier {
  verify(input: { userId: string; dateOfBirth: string; firstName: string; lastName: string }, now: Date): Promise<{ passed: boolean; method: string; reason?: string }>;
}
```

`getAgeVerifier()` returns the verifier in use. To add a provider:

1. Choose a provider and read their documentation and data processing terms. This template makes no assumptions about
   any provider's API.
2. Write a verifier that first runs the built-in `isAdult` check (keep it), then calls the provider. Return
   `passed: false` with a clear `reason` when either fails, and a `method` naming the provider, which is stored on the
   account in `age_check_method`.
3. Return your verifier from `getAgeVerifier()`. Put credentials in environment variables.
4. If the provider needs a redirect or document upload rather than a single call, add a step after sign-up and block
   checkout until it passes (extend `playBlockReason`).
5. Update the privacy notice, ROPA and DPIA: the provider is a new processor, possibly handling special category or
   biometric data.
6. Add tests: under 18 refused, provider failure refused, provider success accepted.
