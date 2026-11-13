import { inArray } from 'drizzle-orm';
import { requireStaff } from '@/lib/web/session';
import { getDb } from '@/lib/db';
import { users, ROLES } from '@/lib/db/schema';
import { PERMISSIONS } from '@/lib/admin/service';
import { FlashMessage } from '@/components/Flash';
import { setRoleAction } from '../actions';

export const metadata = { title: 'Staff' };

export default async function StaffPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff(PERMISSIONS.staff);
  const staff = await getDb().select({ email: users.email, role: users.role, tfa: users.totpEnabledAt }).from(users).where(inArray(users.role, ['support', 'admin', 'owner']));
  return (
    <>
      <h1>Staff and roles</h1>
      <FlashMessage searchParams={await searchParams} />
      <p>Owner: everything, including roles. Admin: competitions, postal entries, refunds, player support, audit log. Support: player support and postal entries. All staff must use two-factor authentication.</p>
      <ul>{staff.map((u) => <li key={u.email}>{u.email}: {u.role}{u.tfa ? '' : ' (2FA not set up yet)'}</li>)}</ul>
      <form className="stack" action={setRoleAction}>
        <label>Account email<input name="email" type="email" required /></label>
        <label>Role<select name="role" defaultValue="support">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
        <button type="submit">Set role</button>
      </form>
    </>
  );
}
