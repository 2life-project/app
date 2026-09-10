/**
 * Тексты входа. Экрана в макете нет — формулировки рабочие и ждут вычитки.
 * Ошибки написаны своими словами намеренно: ответ сервера адресован
 * разработчику, и пересказывать его человеку нельзя.
 */
export const AUTH = {
  title: 'Welcome to 2Life',
  registerTitle: 'Create an account',
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
  loginRule: '3 to 32 characters: latin letters, digits, dot, dash or underscore.',
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
  forgot: 'Forgot the password?',
  reset: {
    title: 'Reset the password',
    /** Три шага: кому слать код, какой код пришёл, какой пароль поставить. */
    subtitle: {
      account: 'Enter your login or email — the code goes to the email on the account.',
      code: 'Enter the six-digit code from the email. It works for an hour.',
      password: 'Pick a new password — at least 8 characters.',
    },
    account: 'Login or email',
    code: 'Code from the email',
    newPassword: 'New password',
    send: 'Send the code',
    check: 'Check the code',
    change: 'Change the password',
    done: 'The password is changed. Sign in with the new one.',
    back: 'Back to sign-in',
    noEmail: 'This account has no email. Recovery needs one — ask us to add it.',
    badCode: 'The code is wrong or has expired. Request a new one.',
    unavailable: 'Recovery is not available right now. Try again later.',
    failed: 'It did not go through. Try again.',
  },
} as const;
