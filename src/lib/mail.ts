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
/** Outgoing email over SMTP (Mailpit in development). Plain text only: no tracking pixels, no remote images. */
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from './env';

let transport: Transporter | undefined;

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export type MailSender = (m: Mail) => Promise<void>;

function getTransport(): Transporter {
  if (!transport) {
    const e = env();
    transport = nodemailer.createTransport({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE,
      requireTLS: !e.SMTP_SECURE && (e.SMTP_REQUIRE_TLS ?? e.NODE_ENV === 'production'),
      auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD ?? '' } : undefined,
    });
  }
  return transport;
}

export const sendMail: MailSender = async (m) => {
  // A public demo has no mail server and its addresses are fictional: never try.
  if (env().DEMO_MODE) return;
  await getTransport().sendMail({ from: env().MAIL_FROM, to: m.to, subject: m.subject, text: m.text });
};

/** Send, but never fail the user's request because the mail server is down: log it instead (they can ask again). */
export async function trySendMail(m: Mail): Promise<boolean> {
  try {
    await sendMail(m);
    return true;
  } catch (e) {
    console.error(`email to ${m.to.replace(/^(.).*@/, '$1***@')} failed: ${(e as Error).message}`);
    return false;
  }
}

export function verifyEmailMail(to: string, url: string): Mail {
  const site = env().SITE_NAME;
  return { to, subject: `Confirm your email for ${site}`, text: `Please confirm your email address by opening this link within 48 hours:\n\n${url}\n\nIf you did not sign up, ignore this email.\n\n${site}` };
}

export function accountExistsMail(to: string, loginUrl: string, resetUrl: string): Mail {
  const site = env().SITE_NAME;
  return { to, subject: `Someone tried to sign up with your email at ${site}`, text: `You already have an account. Log in at ${loginUrl}\nForgotten your password? ${resetUrl}\n\nIf this was not you, you can ignore this email.\n\n${site}` };
}

export function resetMail(to: string, url: string): Mail {
  const site = env().SITE_NAME;
  return { to, subject: `Reset your ${site} password`, text: `Open this link within one hour to choose a new password:\n\n${url}\n\nIf you did not ask for this, ignore this email; your password has not changed.\n\n${site}` };
}

/** To a free postal entrant: their ticket and entry code, or why the entry was not accepted. */
export function postalEntryMail(to: string, competitionTitle: string, outcome: { ticket: number; code: string } | { reason: string }): Mail {
  const site = env().SITE_NAME;
  const body =
    'ticket' in outcome
      ? `We have entered your free postal entry into "${competitionTitle}". Your ticket number is ${outcome.ticket} and its entry code is ${outcome.code}: you can find both in the public entry list, which shows codes, never names. It has exactly the same chance of winning as a paid entry.`
      : `We received your postal entry for "${competitionTitle}" but could not enter it: ${outcome.reason} If you think this is a mistake, reply to this email.`;
  return { to, subject: `Your free entry: ${competitionTitle}`, text: `${body}\n\n${site}` };
}

export function winnerMail(to: string, competitionTitle: string, ticket: number, accountUrl: string): Mail {
  const site = env().SITE_NAME;
  return {
    to,
    subject: `You won: ${competitionTitle}`,
    text: `Congratulations: ticket ${ticket} was drawn as a winner of "${competitionTitle}".\n\nWe will contact you about delivering your prize. If you are happy for your first name and the initial of your surname to be shown on our results page, you can say so in your account: ${accountUrl}\nWe will not show your name unless you agree.\n\n${site}`,
  };
}
