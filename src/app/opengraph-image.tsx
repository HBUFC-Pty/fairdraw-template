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
