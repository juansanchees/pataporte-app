import type { Pet } from './types';

const LEN = 44;

function clean(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '<').replace(/^<+|<+$/g, '');
}

function pad(s: string, n = LEN): string {
  return (s + '<'.repeat(n)).slice(0, n);
}

function charValue(c: string): number {
  if (c === '<') return 0;
  if (/[0-9]/.test(c)) return Number(c);
  return c.charCodeAt(0) - 55; // A=10
}

/** ICAO 9303 check digit (weights 7,3,1). */
export function checkDigit(s: string): string {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += charValue(s[i]) * w[i % 3];
  return String(sum % 10);
}

function yymmdd(day: string): string {
  return day.slice(2, 4) + day.slice(5, 7) + day.slice(8, 10);
}

export function mrzFor(pet: Pet): [string, string] {
  const l1 = pad(`P<PTP${clean(pet.name)}<<${clean(pet.breed)}`);
  const num = pad(pet.passportNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase(), 9);
  const birth = yymmdd(pet.birthDate);
  const issued = pet.issuedAt.slice(0, 10);
  const expiry = `${Number(issued.slice(0, 4)) + 10}${issued.slice(4)}`;
  const exp = yymmdd(expiry);
  const core = `${num}${checkDigit(num)}PET${birth}${checkDigit(birth)}${pet.sex}${exp}${checkDigit(exp)}`;
  const body = pad(core, LEN - 1);
  const final = checkDigit(body.slice(0, 10) + body.slice(13, 20) + body.slice(21, 43));
  return [l1, body + final];
}

export function newPassportNumber(): string {
  return 'PTP' + String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0');
}
