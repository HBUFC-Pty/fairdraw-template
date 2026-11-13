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
      requireTLS: e.NODE_ENV === 'production' && !e.SMTP_SECURE,
      auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD ?? '' } : undefined,
    });
  }
  return transport;
}

export const sendMail: MailSender = async (m) => {
  await getTransport().sendMail({ from: env().MAIL_FROM, to: m.to, subject: m.subject, text: m.text });
};

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

export function winnerMail(to: string, competitionTitle: string, ticket: number, accountUrl: string): Mail {
  const site = env().SITE_NAME;
  return {
    to,
    subject: `You won: ${competitionTitle}`,
    text: `Congratulations: ticket ${ticket} was drawn as a winner of "${competitionTitle}".\n\nWe will contact you about delivering your prize. If you are happy for your first name and the initial of your surname to be shown on our results page, you can say so in your account: ${accountUrl}\nWe will not show your name unless you agree.\n\n${site}`,
  };
}
