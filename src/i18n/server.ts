import { cookies, headers } from 'next/headers';
import { getUserById } from '@/db/queries/users';
import { maybeCurrentUserId } from '@/lib/requestUser';
import { isLocale, localeFromAcceptLanguage, makeT, type Locale } from './index';
import { LOCALE_COOKIE } from './localeCookie';

/**
 * Signed-in: the user's saved language. Signed-out (login/register): a remembered
 * choice cookie, else the browser's Accept-Language.
 */
export async function getLocale(): Promise<Locale> {
  const userId = await maybeCurrentUserId();
  if (userId !== null) {
    const user = await getUserById(userId);
    if (user && isLocale(user.locale)) return user.locale;
  }
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  return localeFromAcceptLanguage((await headers()).get('accept-language'));
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(locale) };
}
