// Source of truth for UI strings. `el.ts` must define every key (enforced by its type and
// by i18n.test.ts). Placeholders use {name} syntax and must match between languages.
export const en = {
  'app.name': 'Organiser',
  'app.tagline': 'Know where your stuff is.',

  'household.defaultName': 'My home',

  'auth.login.title': 'Welcome back',
  'auth.login.submit': 'Log in',
  'auth.login.noAccount': "Don't have an account?",
  'auth.login.toRegister': 'Create one',
  'auth.register.title': 'Create your account',
  'auth.register.submit': 'Create account',
  'auth.register.haveAccount': 'Already have an account?',
  'auth.register.toLogin': 'Log in',
  'auth.field.name': 'Your name',
  'auth.field.email': 'Email',
  'auth.field.password': 'Password',
  'auth.field.passwordHint': 'At least 8 characters',
  'auth.showPassword': 'Show password',
  'auth.hidePassword': 'Hide password',
  'auth.error.invalidCredentials': 'Wrong email or password.',
  'auth.error.emailTaken': 'An account with this email already exists.',
  'auth.error.invalid': 'Please check the highlighted fields.',
  'auth.error.generic': 'Something went wrong. Please try again.',
  'auth.logout': 'Log out',

  'nav.search': 'Search',
  'nav.places': 'Places',
  'nav.add': 'Add',
  'nav.settings': 'Settings',

  'search.placeholder': 'Where did I put…?',
  'search.emptyTitle': 'Find anything, fast',
  'search.emptyBody': 'Search by name, description or tag. Results show exactly where it is.',

  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.loading': 'Loading…',
  'common.comingSoon': 'Coming soon',

  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.account': 'Account',
  'settings.household': 'Household',
} as const;

export type TKey = keyof typeof en;
