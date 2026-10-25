/**
 * Student/trip shapes and the pure completeness helpers. Deliberately free of
 * `server-only` so client components can share them with the server.
 */

export type PortalStudent = {
  id: number;
  fullName: string;
  dateOfBirth: string | null;
  yearGroup: string | null;
  nationality: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  passportFile: string | null;
  consentFile: string | null;
  photoFile: string | null;
  dietary: string | null;
  medical: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  roomGroup: string | null;
  notes: string | null;
  parentName: string | null;
  parentEmail: string | null;
};

export type PortalTrip = {
  id: number;
  quoteId: number | null;
  title: string;
  schoolName: string;
  travelDates: string | null;
  departureDate: string | null;
  paperworkDue: string | null;
  status: 'planning' | 'ready' | 'travelling' | 'completed';
  notes: string | null;
  dataPurgedAt: string | null;
};

/** What each student still owes, so teachers can see the gaps at a glance. */
export const MISSING_LABELS = {
  dateOfBirth: 'Date of birth',
  passportNumber: 'Passport number',
  passportExpiry: 'Passport expiry',
  passportFile: 'Passport copy',
  consentFile: 'Consent form',
  emergencyContactPhone: 'Emergency contact',
} as const;

export type MissingKey = keyof typeof MISSING_LABELS;

export function missingFor(s: PortalStudent): MissingKey[] {
  return (Object.keys(MISSING_LABELS) as MissingKey[]).filter((k) => {
    const v = s[k];
    return v === null || v === undefined || String(v).trim() === '';
  });
}

/** Passport must still be valid well past the return date. */
export function passportExpiringSoon(s: PortalStudent, departure: string | null): boolean {
  if (!s.passportExpiry || !departure) return false;
  const expiry = new Date(s.passportExpiry).getTime();
  const sixMonthsAfter = new Date(departure).getTime() + 182 * 86400_000;
  return expiry < sixMonthsAfter;
}

/** A plain check that an address will reach someone: one @, a dot after it, no spaces. */
export const looksLikeEmail = (v: string | null | undefined): v is string =>
  typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export type StudentDocKind = 'passport' | 'consent' | 'photo';
export const DOC_COLUMN: Record<StudentDocKind, 'passport_file' | 'consent_file' | 'photo_file'> = {
  passport: 'passport_file',
  consent: 'consent_file',
  photo: 'photo_file',
};
