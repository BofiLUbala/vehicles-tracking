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
