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
/** Loads a legal page from content/ and fills {{PLACEHOLDERS}} from the configuration (config/site.json and env). */
import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { env } from '../env';
import { creditCardCapPence } from '../site-config';
import { formatPence } from '../money';

export const CONTENT_DIR = path.join(process.cwd(), 'content');

export function placeholderValues(): Record<string, string> {
  const e = env();
  return {
    SITE_NAME: e.SITE_NAME,
    OPERATOR_LEGAL_NAME: e.OPERATOR_LEGAL_NAME,
    OPERATOR_COMPANY_NUMBER: e.OPERATOR_COMPANY_NUMBER,
    OPERATOR_REGISTERED_ADDRESS: e.OPERATOR_REGISTERED_ADDRESS,
    OPERATOR_ICO_NUMBER: e.OPERATOR_ICO_NUMBER,
    CONTACT_EMAIL: e.CONTACT_EMAIL,
    PRIVACY_EMAIL: e.PRIVACY_EMAIL,
    POSTAL_ENTRY_ADDRESS: e.POSTAL_ENTRY_ADDRESS,
    PAYMENT_PROCESSOR_NAME: e.PAYMENT_PROCESSOR_NAME,
    CREDIT_CARD_CAP: formatPence(creditCardCapPence()),
  };
}

export function loadContent(name: 'terms' | 'privacy'): string {
  return readFileSync(path.join(CONTENT_DIR, `${name}.md`), 'utf8');
}
