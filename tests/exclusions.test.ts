import { beforeEach, describe, expect, it } from 'vitest';
import { addPaidTickets, backdate, makeCompetition, makeUser, testDb } from './helpers/db';
import type { Db } from '../src/lib/db';
import { tickets } from '../src/lib/db/schema';
import { closeCompetition } from '../src/lib/draw/service';
import { exclusionsFor, exclusionsJson, exclusionsSentence, leftOutCount } from '../src/lib/public/exclusions';

let db: Db;
beforeEach(async () => {
  ({ db } = await testDb());
});

describe('tickets left out of the draw, and why', () => {
  it('counts wrong answers (with their numbers) and tickets refunded before the close, never lapsed reservations', async () => {
    const u = await makeUser(db);
    const c = await makeCompetition(db, { skillQuestion: { question: 'What is 2 + 2?', options: ['3', '4'], correctIndex: 1 } });
    const o = await addPaidTickets(db, c.id, u.id, [1, 3]);
    await db.insert(tickets).values([
      { competitionId: c.id, number: 7, userId: u.id, orderId: o.id, source: 'paid', allocation: 'random', status: 'active', answerCorrect: false },
      { competitionId: c.id, number: 2, userId: u.id, orderId: o.id, source: 'paid', allocation: 'random', status: 'active', answerCorrect: false },
      { competitionId: c.id, number: 8, userId: u.id, orderId: o.id, source: 'paid', allocation: 'random', status: 'refunded' },
      { competitionId: c.id, number: 9, userId: u.id, orderId: o.id, source: 'paid', allocation: 'random', status: 'reserved', reservedUntil: new Date(Date.now() + 600_000) },
    ]);
    const closesAt = new Date(Date.now() - 3600_000);
    await backdate(db, c.id, closesAt);
    const commit = await closeCompetition(db, c.id, new Date(closesAt.getTime() + 1000));
    expect(commit.tickets_sold).toBe(2);

    const x = await exclusionsFor(db, c.id);
    expect(x).toEqual({ wrongAnswer: [2, 7], refundedBeforeClose: 1 });
    expect(leftOutCount(x)).toBe(3);
    expect(exclusionsSentence(x)).toBe(
      'Not in the draw: 2 tickets answered the question wrongly, so they were left out and refunded; 1 ticket was refunded before the close and released.',
    );
    const j = exclusionsJson(c.slug, commit.tickets_sold, x);
    expect(j.tickets_in_draw).toBe(2);
    expect(j.left_out.wrong_answer).toEqual({ count: 2, tickets: [2, 7], refunded: true });
    expect(j.left_out.refunded_before_close).toEqual({ count: 1, released: true });
    // Ticket numbers only: nothing about who entered.
    expect(JSON.stringify(j)).not.toMatch(/Sam|Taylor|@example/);
  });

  it('says nothing when nothing was left out', () => {
    expect(exclusionsSentence({ wrongAnswer: [], refundedBeforeClose: 0 })).toBeNull();
    expect(exclusionsSentence({ wrongAnswer: [4], refundedBeforeClose: 0 })).toBe(
      'Not in the draw: 1 ticket answered the question wrongly, so it was left out and refunded.',
    );
  });
});
