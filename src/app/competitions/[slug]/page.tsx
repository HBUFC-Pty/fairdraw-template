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
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { competitionBySlug } from '@/lib/public/queries';
import { FlashMessage } from '@/components/Flash';
import { currentSession } from '@/lib/web/session';
import { isOpen } from '@/lib/competitions/service';
import { env } from '@/lib/env';
import { addToBasketAction } from '../../basket/actions';
import { publicInstant } from '@/lib/public/instant';
import { CompetitionView } from '@/components/competition/CompetitionView';
import { brand } from '@/brand';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await competitionBySlug((await params).slug);
  return { title: r?.c.title ?? 'Competition' };
}

export default async function CompetitionPage({ params, searchParams }: Props) {
  const r = await competitionBySlug((await params).slug);
  if (!r) notFound();
  const { c, draw, sold, winners } = r;
  const s = await currentSession();
  const inst = await publicInstant(c);
  const now = new Date();
  return (
    <>
      <FlashMessage searchParams={await searchParams} />
      <CompetitionView
        c={c}
        sold={sold}
        draw={draw}
        winners={winners}
        inst={inst}
        now={now}
        open={isOpen(c, now)}
        loggedIn={Boolean(s)}
        badges={brand.extras.badges}
        postalAddress={env().POSTAL_ENTRY_ADDRESS}
        promoter={env().OPERATOR_LEGAL_NAME}
        action={addToBasketAction}
      />
    </>
  );
}
