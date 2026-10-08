export interface Language {
  code: string;
  name: string; // English name
  native: string;
  speech: string; // BCP-47 for Web Speech API
  rtl?: boolean;
}

/** Languages of Des Moines' main refugee and immigrant communities (to confirm with local partners). */
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English', speech: 'en-US' },
  { code: 'es', name: 'Spanish', native: 'Español', speech: 'es-US' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili', speech: 'sw-KE' },
  { code: 'my', name: 'Burmese', native: 'မြန်မာ', speech: 'my-MM' },
  { code: 'ar', name: 'Arabic', native: 'العربية', speech: 'ar-SA', rtl: true },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', speech: 'vi-VN' },
  { code: 'fr', name: 'French', native: 'Français', speech: 'fr-FR' },
  { code: 'rw', name: 'Kinyarwanda', native: 'Ikinyarwanda', speech: 'rw-RW' },
];

export const langByCode = (code: string) => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];

/** Keywords that work in every language, without the AI (basic phones, outages). */
export const KEYWORDS: Record<'help' | 'delete' | 'hours' | 'missions' | 'yes' | 'no' | 'attestation' | 'stop', string[]> = {
  help: ['help', 'aide', 'ayuda', 'msaada', 'مساعدة', 'giúp', 'ubufasha', 'agent', 'human', 'person'],
  delete: ['delete', 'supprimer', 'borrar', 'eliminar', 'futa', 'حذف', 'xóa', 'siba'],
  stop: ['stop', 'unsubscribe', 'arrêt', 'alto'],
  hours: ['hours', 'heures', 'horas', 'saa', 'ساعات', 'giờ', 'amasaha', 'gauge', 'jauge'],
  missions: ['missions', 'more', 'misiones', 'plus', 'kazi', 'nhiệm vụ', 'slots', 'créneaux'],
  attestation: ['attestation', 'proof', 'report', 'certificado', 'constancia', 'ushahidi', 'certificate'],
  yes: ['yes', 'y', 'oui', 'sí', 'si', 'ndiyo', 'نعم', 'có', 'yego', 'ok', 'okay'],
  no: ['no', 'n', 'non', 'hapana', 'لا', 'không', 'oya'],
};

export function keyword(text: string): keyof typeof KEYWORDS | null {
  const t = text.trim().toLowerCase().replace(/[.!?¡¿]/g, '');
  for (const [k, words] of Object.entries(KEYWORDS)) if (words.includes(t)) return k as keyof typeof KEYWORDS;
  return null;
}
