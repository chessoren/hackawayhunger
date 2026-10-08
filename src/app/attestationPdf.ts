import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { AttestationPayload } from '../core/attestation';
import { fingerprint } from '../core/crypto';

const GREEN = rgb(0.07, 0.42, 0.25);
const ORANGE = rgb(0.95, 0.5, 0.13);
const INK = rgb(0.1, 0.12, 0.12);
const MUTED = rgb(0.4, 0.43, 0.43);

/** Strip characters the standard PDF fonts cannot encode. */
const safe = (s: string) => s.replace(/[^\x20-\x7E]/g, (c) => ({ '—': '-', '–': '-', '’': "'", '“': '"', '”': '"', 'é': 'e', 'è': 'e', 'á': 'a', 'ñ': 'n' } as Record<string, string>)[c] ?? '');

export async function attestationPdf(p: AttestationPayload, verifyLink: string, signerKey: string, dev: boolean): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Count Me In — Hours attestation ${p.m} — ${p.n}`);
  doc.setAuthor('Count Me In');
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 612;
  let y = 740;
  const text = (t: string, x: number, yy: number, size = 10, f = font, color = INK) => page.drawText(safe(t), { x, y: yy, size, font: f, color });

  page.drawRectangle({ x: 0, y: 752, width: W, height: 40, color: GREEN });
  text('COUNT ME IN', 40, 766, 16, bold, rgb(1, 1, 1));
  text('Verified hours attestation - SNAP work requirement', 170, 767, 11, font, rgb(1, 1, 1));

  y = 720;
  text(`Name: ${p.n}`, 40, y, 12, bold);
  text(`Month: ${new Date(p.m + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, 40, y - 18, 11);
  text(`Attestation ID: ${p.id}`, 40, y - 34, 9, font, MUTED);
  text(`Issued: ${new Date(p.iss).toLocaleString('en-US')}   State: Iowa   Rules: ${p.rv}`, 40, y - 47, 9, font, MUTED);

  const qr = await QRCode.toDataURL(verifyLink, { errorCorrectionLevel: 'L', margin: 1, width: 400 });
  const png = await doc.embedPng(qr);
  page.drawImage(png, { x: W - 40 - 120, y: 610, width: 120, height: 120 });
  text('Scan to verify', W - 40 - 98, 600, 9, bold, GREEN);

  // Totals
  y = 640;
  page.drawRectangle({ x: 40, y: y - 40, width: 380, height: 50, color: rgb(0.95, 0.97, 0.95) });
  text(`${p.tot.all} hours`, 52, y - 22, 22, bold, p.tot.all >= p.goal ? GREEN : ORANGE);
  text(`of ${p.goal} required`, 160, y - 20, 11, font, MUTED);
  text(`Volunteering ${p.tot.volunteer} h  |  Training ${p.tot.training} h  |  Paid work (declared) ${p.tot.paid_declared} h`, 52, y - 34, 9, font, INK);

  // Table
  y = 575;
  const cols = [40, 100, 238, 360, 400, 440, 470];
  const head = ['Date', 'Organization', 'Mission', 'In', 'Out', 'Hrs', 'Validated by'];
  page.drawRectangle({ x: 36, y: y - 5, width: W - 72, height: 18, color: GREEN });
  head.forEach((h, i) => text(h, cols[i], y, 9, bold, rgb(1, 1, 1)));
  y -= 20;
  for (const it of p.it) {
    if (y < 150) break;
    const row = [it.d.slice(5), it.s.slice(0, 26), it.mi.slice(0, 24), it.in, it.out, String(it.h), it.c.slice(0, 22)];
    row.forEach((v, i) => text(v, cols[i], y, 8.5));
    if (it.vh) text(`ledger ${it.vh} · coordinator key ${it.vk ?? ''}`, cols[1], y - 10, 6.5, font, MUTED);
    y -= it.vh ? 24 : 16;
    page.drawLine({ start: { x: 36, y: y + 8 }, end: { x: W - 36, y: y + 8 }, thickness: 0.4, color: rgb(0.85, 0.87, 0.87) });
  }

  // Integrity box
  y = 140;
  page.drawRectangle({ x: 36, y: 40, width: W - 72, height: y - 40, borderColor: GREEN, borderWidth: 1 });
  text('How this document is protected', 48, y - 18, 10, bold, GREEN);
  const lines = [
    'Double validation: the person checks in and out on site; the site coordinator confirms each shift.',
    'Each confirmation is an entry in an append-only, hash-chained ledger, signed with the coordinator\'s Ed25519 key.',
    `The whole attestation is signed by the Count Me In platform key ${fingerprint(signerKey)}.`,
    'Changing any character breaks the signature. Paid work and training lines are declared by the person.',
    dev ? 'NOTE: signed with a DEVELOPMENT key (local demo). Not valid for submission.' : 'Shared with Iowa HHS only after the person\'s explicit YES.',
  ];
  lines.forEach((l, i) => text(l, 48, y - 34 - i * 13, 8.5, font, i === 4 && dev ? ORANGE : INK));
  text(safe(verifyLink.slice(0, 95) + (verifyLink.length > 95 ? '...' : '')), 48, 46, 6, font, MUTED);
  return doc.save();
}

export function downloadBytes(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
