// Parte da segurança sem dependência de Node (usável no navegador).
export { sha256Hex } from './sha256';
export const isAppId = (s: unknown): s is string =>
  typeof s === 'string' && s.length > 0 && s.length <= 256 && /^[A-Za-z0-9._\-=+/]+$/.test(s);
