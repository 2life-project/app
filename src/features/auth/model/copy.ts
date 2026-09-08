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
  createAccount: 'I am new — create an account',
  or: 'or',
  google: 'Continue with Google',
  apple: 'Continue with Apple',
  socialSoon: 'Google and Apple sign-in are not available yet.',
  signInFailed: 'Wrong login or password.',
  registerFailed: 'This login is taken, or the password is too simple. Try another one.',
  tooMany: (seconds: number) => `Too many attempts. Try again in ${seconds} s.`,
  disclaimer: 'The session is kept in the phone keychain and renews itself on its own.',
} as const;
