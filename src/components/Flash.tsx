import { readFlash } from '@/lib/web/flash';

export function FlashMessage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const f = readFlash(searchParams);
  if (!f.error && !f.notice) return null;
  return (
    <div className={`flash ${f.error ? 'err' : 'ok'}`} role={f.error ? 'alert' : 'status'}>
      {f.error ?? f.notice}
    </div>
  );
}
