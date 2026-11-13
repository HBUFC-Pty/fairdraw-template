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
