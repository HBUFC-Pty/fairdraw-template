/*
 * The contents of this file are subject to the Common Public Attribution License Version 1.0 (the “License”); you may
 * not use this file except in compliance with the License. You may obtain a copy of the License at
 * https://opensource.org/license/CPAL-1.0. The License is based on the Mozilla Public License Version 1.1 but Sections
 * 14 and 15 have been added to cover use of software over a computer network and provide for limited attribution for
 * the Original Developer. In addition, Exhibit A has been modified to be consistent with Exhibit B.
 * Software distributed under the License is distributed on an “AS IS” basis, WITHOUT WARRANTY OF ANY KIND, either
 * express or implied. See the License for the specific language governing rights and limitations under the License.
 * The Original Code is FairDraw operator template.
 * The Initial Developer of the Original Code is Harrison Jones. All portions of the code written by Harrison Jones are
 * Copyright (c) 2026 Harrison Jones. All Rights Reserved.
 */
/**
 * Age check: every player must be 18 or over. Date of birth is collected at sign-up and checked here.
 *
 * Third-party age verification hook: the self-declared check below is the default. To add an age verification
 * provider, implement AgeVerifier (for example by calling your provider from `verify`) and return it from
 * getAgeVerifier(). See docs/age-verification.md. Never remove the 18+ check itself.
 */
import { ukDate } from '../time';

export const MINIMUM_AGE = 18;

/** Whole years between a YYYY-MM-DD date of birth and a YYYY-MM-DD date (UK calendar). */
export function ageOn(dateOfBirth: string, onDate: string): number {
  const [by, bm, bd] = dateOfBirth.split('-').map(Number) as [number, number, number];
  const [y, m, d] = onDate.split('-').map(Number) as [number, number, number];
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age -= 1;
  return age;
}

export function isValidDateOfBirth(dateOfBirth: string, now: Date): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return false;
  return y >= 1900 && dateOfBirth <= ukDate(now);
}

export function isAdult(dateOfBirth: string, now: Date): boolean {
  return isValidDateOfBirth(dateOfBirth, now) && ageOn(dateOfBirth, ukDate(now)) >= MINIMUM_AGE;
}

export interface AgeCheckInput {
  userId: string;
  dateOfBirth: string;
  firstName: string;
  lastName: string;
}

export interface AgeCheckResult {
  passed: boolean;
  method: string;
  reason?: string;
}

export interface AgeVerifier {
  verify(input: AgeCheckInput, now: Date): Promise<AgeCheckResult>;
}

export const selfDeclaredAgeVerifier: AgeVerifier = {
  async verify(input, now) {
    return isAdult(input.dateOfBirth, now)
      ? { passed: true, method: 'self_declared' }
      : { passed: false, method: 'self_declared', reason: 'You must be 18 or over to play.' };
  },
};

export function getAgeVerifier(): AgeVerifier {
  return selfDeclaredAgeVerifier;
}
