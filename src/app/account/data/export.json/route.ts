import { currentSession } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { exportUserData } from '@/lib/account/service';

export async function GET() {
  const s = await currentSession();
  if (!s || (s.user.totpEnabledAt && !s.session.mfaVerifiedAt)) return new Response('Please log in.', { status: 401 });
  const data = await exportUserData(getDb(), s.user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="my-data.json"',
      'Cache-Control': 'no-store',
    },
  });
}
