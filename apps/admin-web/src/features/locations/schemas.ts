import { z } from 'zod';
import { LOCATION_TYPES } from '@/features/locations/types';

export const locationFormSchema = z.object({
  name: z.string().min(1, { message: 'Le nom est requis' }),
  type: z.enum(LOCATION_TYPES, { errorMap: () => ({ message: 'Le type est requis' }) }),
  address: z.string().optional(),
  latitude: z
    .number({ required_error: 'La latitude est requise', invalid_type_error: 'La latitude est requise' })
    .min(-90, { message: 'La latitude doit être comprise entre -90 et 90' })
    .max(90, { message: 'La latitude doit être comprise entre -90 et 90' }),
  longitude: z
    .number({ required_error: 'La longitude est requise', invalid_type_error: 'La longitude est requise' })
    .min(-180, { message: 'La longitude doit être comprise entre -180 et 180' })
    .max(180, { message: 'La longitude doit être comprise entre -180 et 180' }),
  allowedRadius: z
    .number({ invalid_type_error: 'Le rayon doit être un nombre' })
    .int({ message: 'Le rayon doit être un entier' })
    .min(1, { message: 'Le rayon doit être supérieur à 0' })
    .optional(),
});

export type LocationFormValues = z.infer<typeof locationFormSchema>;
