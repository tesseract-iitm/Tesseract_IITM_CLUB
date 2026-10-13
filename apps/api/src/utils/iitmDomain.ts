// Tesseract is gated to IITM BS Degree students only. Branch is derived from
// the email subdomain — keep this list narrow because branch derivation
// depends on the exact subdomain.
export const IITM_DOMAINS = ['ds.study.iitm.ac.in', 'es.study.iitm.ac.in', 'mg.study.iitm.ac.in', 'ae.study.iitm.ac.in'] as const;

export type IitmBranch = 'Data Science' | 'Electronic Systems' | 'Management and Data Science' | 'Aeronautics and Space Technology';

export function isIitmEmail(email: string): boolean {
  const domain = email.split('@')[1]?.trim().toLowerCase() ?? '';
  return (IITM_DOMAINS as readonly string[]).includes(domain);
}

export function getBranchFromEmail(email: string): IitmBranch | null {
  const domain = email.split('@')[1]?.trim().toLowerCase() ?? '';
  if (domain === 'ds.study.iitm.ac.in') return 'Data Science';
  if (domain === 'es.study.iitm.ac.in') return 'Electronic Systems';
  if (domain === 'mg.study.iitm.ac.in') return 'Management and Data Science';
  if (domain === 'ae.study.iitm.ac.in') return 'Aeronautics and Space Technology';
  return null;
}
