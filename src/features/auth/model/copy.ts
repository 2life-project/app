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
  createAccount: 'Create an account with this login',
  or: 'or',
  google: 'Continue with Google',
  apple: 'Continue with Apple',
  socialSoon: 'Google and Apple sign-in are not available yet.',
  signInFailed: 'Wrong login or password. If you are new here, create an account below.',
  registerFailed: 'The account was not created. This login may already be taken.',
  tooMany: (seconds: number) => `Too many attempts. Try again in ${seconds} s.`,
  disclaimer: 'The session is kept in the phone keychain and renews itself on its own.',
} as const;
