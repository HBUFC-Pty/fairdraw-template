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
import { ImageResponse } from 'next/og';
import { brand } from '@/brand';
import { siteConfig } from '@/lib/site-config';

// A monogram favicon in the brand colours. To use your own, set "favicon" in config/brand.json.
export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  const c = brand.colours.light;
  const letter = (process.env.SITE_NAME || siteConfig.siteName).trim().charAt(0).toUpperCase() || 'F';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.primary, color: c.onPrimary, fontSize: 44, fontWeight: 700, borderRadius: 14 }}>
        {letter}
      </div>
    ),
    size,
  );
}
