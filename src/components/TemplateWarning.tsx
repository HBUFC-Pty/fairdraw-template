import { env } from '@/lib/env';

/** Shown on legal pages until the operator has filled in their details (placeholders still start with "["). */
export function TemplateWarning() {
  const e = env();
  const placeholders = [e.OPERATOR_LEGAL_NAME, e.OPERATOR_COMPANY_NUMBER, e.OPERATOR_REGISTERED_ADDRESS, e.POSTAL_ENTRY_ADDRESS, e.PAYMENT_PROCESSOR_NAME, e.OPERATOR_ICO_NUMBER].some((v) => v.startsWith('['));
  if (!placeholders) return null;
  return (
    <p className="notice warn" role="note">
      This page is still a template: the operator&apos;s details have not been filled in. It is not legal advice and must be reviewed by a qualified
      solicitor before the site goes live.
    </p>
  );
}
