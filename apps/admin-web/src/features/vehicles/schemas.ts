import { z } from 'zod';

export const VEHICLE_STATUSES = ['AVAILABLE', 'ON_MISSION', 'BROKEN_DOWN', 'IN_MAINTENANCE', 'DISABLED'] as const;

const currentYear = new Date().getFullYear();

export const vehicleFormSchema = z.object({
  plateNumber: z.string().min(1, "L'immatriculation est requise"),
  brand: z.string().optional().or(z.literal('')),
  model: z.string().optional().or(z.literal('')),
  year: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || (Number.isInteger(v) && v >= 1950 && v <= currentYear + 1), {
      message: `Année invalide (1950–${currentYear + 1})`,
    }),
  status: z.enum(VEHICLE_STATUSES).optional(),
  tankCapacity: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || (!Number.isNaN(v) && v > 0), {
      message: 'La capacité du réservoir doit être un nombre positif',
    }),
});

export type VehicleFormValues = z.input<typeof vehicleFormSchema>;
export type VehicleFormOutput = z.output<typeof vehicleFormSchema>;
