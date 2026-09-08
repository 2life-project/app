/**
 * Тексты входа. Экрана в макете нет — формулировки рабочие и ждут вычитки.
 * Ошибки написаны своими словами намеренно: ответ сервера адресован
 * разработчику, и пересказывать его человеку нельзя.
 */
export const AUTH = {
  title: 'Welcome to 2Life',
  subtitle: 'Your metrics, documents and protocols in one place.',
  login: 'Login',
  password: 'Password',
  continue: 'Continue',
  createAccount: 'I am new here — create an account',
  or: 'or',
  needBoth: 'Enter a login and a password.',
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
