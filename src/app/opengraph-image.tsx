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

// The social sharing image, drawn from the brand tokens so every site's preview looks like that site.
export const alt = 'Prize competitions with draws anyone can check';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  const c = brand.colours.light;
  const name = process.env.SITE_NAME || siteConfig.siteName;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: c.bg,
          color: c.text,
          borderTop: `24px solid ${c.primary}`,
        }}
      >
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
        <div style={{ fontSize: 40, color: c.muted }}>{brand.tone.summary}</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 30 }}>
          <span style={{ background: c.primary, color: c.onPrimary, padding: '10px 22px', borderRadius: 12 }}>Every draw can be checked</span>
          <span style={{ background: c.accent, color: c.onAccent, padding: '10px 22px', borderRadius: 12 }}>Free entry by post</span>
        </div>
      </div>
    ),
    size,
  );
}
