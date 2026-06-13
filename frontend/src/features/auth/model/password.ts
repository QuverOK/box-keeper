export interface PasswordCheck {
    key: string;
    label: string;
    passed: boolean;
}
export interface PasswordValidationResult {
    checks: PasswordCheck[];
    isValid: boolean;
}
export function validatePassword(password: string): PasswordValidationResult {
    const checks: PasswordCheck[] = [
        {
            key: "minLength",
            label: "Минимум 8 символов",
            passed: password.length >= 8,
        },
        {
            key: "hasUppercase",
            label: "Заглавная буква",
            passed: /[A-ZА-ЯЁ]/.test(password),
        },
        {
            key: "hasDigit",
            label: "Цифра",
            passed: /\d/.test(password),
        },
        {
            key: "hasSpecial",
            label: "Специальный символ",
            passed: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
        },
    ];
    return {
        checks,
        isValid: checks.every((c) => c.passed),
    };
}
export function passwordsMatch(password: string, confirm: string): boolean {
    return password.length > 0 && password === confirm;
}
