import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { requireStaff } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { competitions } from '@/lib/db/schema';
import { PERMISSIONS } from '@/lib/admin/service';
import { FlashMessage } from '@/components/Flash';
import { formatUk } from '@/lib/time';

export const metadata = { title: 'Competitions' };

export default async function AdminCompetitions({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireStaff(PERMISSIONS.postal);
  const manage = (PERMISSIONS.competitions as readonly string[]).includes(s.user.role);
  const rows = await getDb().select().from(competitions).orderBy(desc(competitions.createdAt)).limit(200);
  return (
    <>
      <h1>Competitions</h1>
      <FlashMessage searchParams={await searchParams} />
      {manage ? <p><Link className="button" href="/admin/competitions/new">New competition</Link></p> : null}
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Title</th><th scope="col">Status</th><th scope="col">Closes</th><th scope="col">Draw</th><th scope="col">Actions</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{manage ? <Link href={`/admin/competitions/${c.id}`}>{c.title}</Link> : c.title}</td>
                <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                <td>{formatUk(c.closesAt)}</td>
                <td>{formatUk(c.drawAt)}</td>
                <td>{c.status === 'live' ? <Link href={`/admin/competitions/${c.id}/postal`}>Postal entries</Link> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
