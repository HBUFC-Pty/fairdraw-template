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
/** The number of tickets in a player's basket, for the header badge. Read-only. */
import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { getDb, type Db } from '../db';
import { basketItems } from '../db/schema';

export async function basketCount(userId: string, db: Db = getDb()): Promise<number> {
  const [r] = await db
    .select({ n: sql<string>`coalesce(sum(${basketItems.quantity}), 0)` })
    .from(basketItems)
    .where(eq(basketItems.userId, userId));
  return Number(r?.n ?? 0);
}
