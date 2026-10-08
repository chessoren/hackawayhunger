import { LLM, Part } from './llm';
import { langByCode } from './i18n';

export interface LetterReading {
  is_official_letter: boolean;
  letter_type: string;
  sender: string;
  /** Three short sentences in the person's language. */
  summary: string[];
  deadline: string | null; // YYYY-MM-DD
  action: string;
  phone_to_call: string | null;
  mentions_work_requirement: boolean;
  confidence: 'high' | 'medium' | 'low';
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_official_letter', 'letter_type', 'sender', 'summary', 'deadline', 'action', 'phone_to_call', 'mentions_work_requirement', 'confidence'],
  properties: {
    is_official_letter: { type: 'boolean' },
    letter_type: { type: 'string', description: 'e.g. "SNAP work requirement notice", "renewal", "benefit change"' },
    sender: { type: 'string' },
    summary: { type: 'array', items: { type: 'string' }, description: 'Exactly 3 short sentences in the target language' },
    deadline: { type: ['string', 'null'], description: 'Main deadline as YYYY-MM-DD, or null' },
    action: { type: 'string', description: 'The one thing the person must do, in the target language' },
    phone_to_call: { type: ['string', 'null'] },
    mentions_work_requirement: { type: 'boolean' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
};

/** Vision + OCR on a phone photo of an administrative letter (crooked, dim, partial). */
export async function readLetter(llm: LLM, image: { base64: string; mediaType: string }, lang: string, today: Date): Promise<LetterReading> {
  const language = langByCode(lang).name;
  const user: Part[] = [
    { type: 'image', mediaType: image.mediaType, base64: image.base64 },
    {
      type: 'text',
      text: `Today is ${today.toISOString().slice(0, 10)}. Read this photo of a letter received by a person who gets SNAP food assistance. Write the summary and action in ${language}, at a 5th-grade reading level, warm and calm, no jargon. If a deadline is written as "within N days of the date of this notice", compute the date. If the photo is not a letter, set is_official_letter=false.`,
    },
  ];
  return llm.json<LetterReading>({
    system:
      'You help people understand administrative letters about food assistance. Extract facts exactly as written; never invent a date, amount, rule or phone number. If unreadable, say so with confidence "low". Never tell the person whether they are eligible — only what the letter says and what it asks.',
    user,
    schema: SCHEMA,
    schemaName: 'letter_reading',
    maxTokens: 6000,
    effort: 'medium',
  });
}
