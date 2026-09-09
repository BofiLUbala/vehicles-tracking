import { z } from 'zod';
import { MISSION_STEP_ACTION_TYPES } from '@/features/missions/status-labels';

export const missionStepSchema = z.object({
  locationId: z.string().min(1, { message: 'Le lieu est requis' }),
  actionType: z.enum(MISSION_STEP_ACTION_TYPES, { errorMap: () => ({ message: "Le type d'action est requis" }) }),
  plannedAt: z.string().optional(),
  toleranceMin: z.coerce
    .number({ invalid_type_error: 'La tolérance doit être un nombre' })
    .int()
    .min(1, { message: 'La tolérance doit être supérieure à 0' })
    .optional(),
});

export const missionFormSchema = z.object({
  driverId: z.string().min(1, { message: 'Le chauffeur est requis' }),
  vehicleId: z.string().min(1, { message: 'Le véhicule est requis' }),
  plannedStart: z.string().optional(),
  plannedEnd: z.string().optional(),
  steps: z.array(missionStepSchema).min(1, { message: 'Au moins une étape est requise' }),
});

export type MissionFormValues = z.infer<typeof missionFormSchema>;

export const cancelMissionSchema = z.object({
  reason: z.string().min(3, { message: 'La raison doit contenir au moins 3 caractères' }),
});

export type CancelMissionFormValues = z.infer<typeof cancelMissionSchema>;

export const assignMissionSchema = z.object({
  driverId: z.string().min(1, { message: 'Le chauffeur est requis' }),
  vehicleId: z.string().min(1, { message: 'Le véhicule est requis' }),
});

export type AssignMissionFormValues = z.infer<typeof assignMissionSchema>;
