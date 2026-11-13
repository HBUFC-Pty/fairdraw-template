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
import { env } from '@/lib/env';

/** Shown on legal pages until the operator has filled in their details (placeholders still start with "["). */
export function TemplateWarning() {
  const e = env();
  const placeholders = [e.OPERATOR_LEGAL_NAME, e.OPERATOR_COMPANY_NUMBER, e.OPERATOR_REGISTERED_ADDRESS, e.POSTAL_ENTRY_ADDRESS, e.PAYMENT_PROCESSOR_NAME, e.OPERATOR_ICO_NUMBER].some((v) => v.startsWith('['));
  if (!placeholders) return null;
  return (
    <p className="notice warn" role="note">
      This page is still a template: the operator&apos;s details have not been filled in. It is not legal advice and must be reviewed by a qualified
      solicitor before the site goes live.
    </p>
  );
}
