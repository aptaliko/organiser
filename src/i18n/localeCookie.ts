export const LOCALE_COOKIE = 'organiser_locale';

/** Remembers the language choice for signed-out pages (login/register). Client-only. */
export function setLocaleCookie(locale: string) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
