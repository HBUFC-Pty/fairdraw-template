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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetEnvCache } from '@/lib/env';

const runTick = vi.fn(async () => true);
const retentionIfDue = vi.fn(async () => false);
vi.mock('@/lib/worker', () => ({ runTick: () => runTick(), retentionIfDue: () => retentionIfDue() }));

const SECRET = 'c'.repeat(40);

async function call(auth?: string) {
  const { POST } = await import('@/app/api/cron/tick/route');
  return POST(new Request('http://localhost/api/cron/tick', { method: 'POST', headers: auth ? { authorization: auth } : {} }));
}

afterEach(() => {
  delete process.env.CRON_SECRET;
  resetEnvCache();
  runTick.mockClear();
});

describe('serverless trigger /api/cron/tick', () => {
  it('does not exist when CRON_SECRET is unset (every Docker install)', async () => {
    const r = await call(`Bearer ${SECRET}`);
    expect(r.status).toBe(404);
    expect(runTick).not.toHaveBeenCalled();
  });

  it('refuses a missing or wrong secret', async () => {
    process.env.CRON_SECRET = SECRET;
    resetEnvCache();
    expect((await call()).status).toBe(401);
    expect((await call(`Bearer ${'x'.repeat(40)}`)).status).toBe(401);
    expect((await call(SECRET)).status).toBe(401);
    expect(runTick).not.toHaveBeenCalled();
  });

  it('runs one cycle with the right secret', async () => {
    process.env.CRON_SECRET = SECRET;
    resetEnvCache();
    const r = await call(`Bearer ${SECRET}`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, ran: true, retention: false });
    expect(runTick).toHaveBeenCalledTimes(1);
  });

  it('rejects a CRON_SECRET shorter than 32 characters', async () => {
    process.env.CRON_SECRET = 'short';
    resetEnvCache();
    await expect(call('Bearer short')).rejects.toThrow(/CRON_SECRET/);
  });
});
