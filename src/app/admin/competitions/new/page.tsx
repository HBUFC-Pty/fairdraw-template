import { requireStaff } from '@/lib/web/session';
import { PERMISSIONS } from '@/lib/admin/service';
import { FlashMessage } from '@/components/Flash';
import { CompetitionForm } from '../../CompetitionForm';

export const metadata = { title: 'New competition' };

export default async function NewCompetition({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStaff(PERMISSIONS.competitions);
  return (
    <>
      <h1>New competition</h1>
      <FlashMessage searchParams={await searchParams} />
      <CompetitionForm />
    </>
  );
}
