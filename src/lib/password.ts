export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Şifre en az 8 karakter olmalıdır.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Şifre en az bir büyük harf içermelidir.";
  }
  if (!/[0-9]/.test(password)) {
    return "Şifre en az bir rakam içermelidir.";
  }
  return null;
}

export const PASSWORD_HINT =
  "En az 8 karakter, bir büyük harf ve bir rakam içermelidir.";
