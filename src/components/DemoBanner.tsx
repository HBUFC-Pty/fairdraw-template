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
import { demoMode, TEMPLATE_REPO_URL } from '@/lib/demo';

/** Shown on every page of a demo site (DEMO_MODE=true): nothing here is real. */
export function DemoBanner() {
  if (!demoMode()) return null;
  return (
    <div className="demo-banner" role="note">
      <p className="wrap">
        <strong>Demo for operators: nothing here is real.</strong> Payments are test only, the prizes and other players are made up, and
        accounts you create are deleted after 24 hours. <a href={TEMPLATE_REPO_URL}>Get the template</a>
      </p>
    </div>
  );
}
