import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, { message: "L'e-mail est requis" }).email({ message: 'Adresse e-mail invalide' }),
  password: z.string().min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' }),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres' }),
});
export type OtpFormValues = z.infer<typeof otpSchema>;

export const forgotPasswordRequestSchema = z.object({
  email: z.string().min(1, { message: "L'e-mail est requis" }).email({ message: 'Adresse e-mail invalide' }),
});
export type ForgotPasswordRequestValues = z.infer<typeof forgotPasswordRequestSchema>;

export const forgotPasswordVerifySchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres' }),
    newPassword: z.string().min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' }),
    confirmPassword: z.string().min(1, { message: 'Veuillez confirmer le mot de passe' }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });
export type ForgotPasswordVerifyValues = z.infer<typeof forgotPasswordVerifySchema>;
