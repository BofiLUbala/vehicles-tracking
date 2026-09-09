import { z } from 'zod';

/** Même règle que `PHONE_REGEX` côté API (`apps/api/src/auth/dto/request-otp.dto.ts`). */
export const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

export const DRIVER_STATUSES = ['ACTIVE', 'SUSPENDED', 'UNAVAILABLE', 'DISABLED'] as const;

export const driverFormSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  phone: z.string().regex(PHONE_REGEX, 'Le numéro doit être au format E.164, ex: +243999000000'),
  licenseNumber: z.string().optional().or(z.literal('')),
  status: z.enum(DRIVER_STATUSES).optional(),
});

export type DriverFormValues = z.infer<typeof driverFormSchema>;
