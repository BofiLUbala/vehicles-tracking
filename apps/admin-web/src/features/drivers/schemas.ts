import { z } from 'zod';

/** Même règle que `PHONE_REGEX` côté API (`apps/api/src/auth/dto/phone.ts`). */
export const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

export const DRIVER_STATUSES = ['ACTIVE', 'SUSPENDED', 'UNAVAILABLE', 'DISABLED'] as const;

export const driverFormSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  phone: z.string().regex(PHONE_REGEX, 'Le numéro doit être au format E.164, ex: +243999000000'),
  email: z.string().email('Adresse e-mail invalide').optional().or(z.literal('')),
  licenseNumber: z.string().optional().or(z.literal('')),
  status: z.enum(DRIVER_STATUSES).optional(),
});

export type DriverFormValues = z.infer<typeof driverFormSchema>;

/** Invitation : l'e-mail est obligatoire, le lien d'activation du compte mobile y est envoyé. */
export const inviteDriverSchema = driverFormSchema.extend({
  email: z.string().trim().min(1, 'L’e-mail est requis pour envoyer le lien d’activation').email('Adresse e-mail invalide'),
});
