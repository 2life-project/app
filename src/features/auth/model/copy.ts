/**
 * Тексты входа. Экрана в макете нет — формулировки рабочие и ждут вычитки.
 * Ошибки написаны своими словами намеренно: ответ сервера адресован
 * разработчику, и пересказывать его человеку нельзя.
 */
export const AUTH = {
  title: 'Welcome to 2Life',
  /** Подзаголовок меняется вместе с режимом: он и объясняет, где ты сейчас. */
  subtitle: {
    in: 'Your metrics, documents and protocols in one place.',
    up: 'Pick a login and a password — that is all we need to start.',
  },
  login: 'Login',
  password: 'Password',
  continue: { in: 'Continue', up: 'Create account' },
  /** Ссылка внизу ведёт в другой режим и называет тот, куда ведёт. */
  switchTo: { in: 'I am new here — create an account', up: 'I already have an account' },
  or: 'or',
  needBoth: { in: 'Enter a login and a password.', up: 'Pick a login and a password.' },
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  google: 'Continue with Google',
  apple: 'Continue with Apple',
  socialSoon: 'Google and Apple sign-in are not available yet.',
  signInFailed: 'Could not sign in. Check the login and password.',
  registerFailed: 'Could not create the account. Try another login.',
  wrongPair: 'Wrong login or password.',
  badUsername: '3 to 32 characters: latin letters, digits, dot, dash or underscore.',
  badPassword: 'The password is too simple — make it longer.',
  loginTaken: 'This login is already taken.',
  tooMany: (seconds: number) => `Too many attempts. Try again in ${seconds} s.`,
  disclaimer: 'The session is kept in the phone keychain and renews itself on its own.',
} as const;
