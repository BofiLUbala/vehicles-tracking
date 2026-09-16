import { apiClient } from './client';
import { StepValidationPayload, ValidationResponse } from '../types/tracking.types';

export interface ValidateStepParams {
  stepId: string;
  payload: StepValidationPayload;
  photoUri: string;
}

export const ValidationApi = {
  async validateStep(params: ValidateStepParams): Promise<ValidationResponse> {
    try {
      const formData = new FormData();

      formData.append('data', JSON.stringify(params.payload));

      const filename = params.photoUri.split('/').pop() || `step_${params.stepId}.jpg`;
      formData.append('photo', {
        uri: params.photoUri,
        name: filename,
        type: 'image/jpeg',
      } as any);

      await apiClient.post(`/mission-steps/${params.stepId}/validate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return { success: true };
    } catch (error: any) {
      const responseData = error.response?.data;
      const errorCode = responseData?.errorCode;
      const message = responseData?.message;

      if (!errorCode && (!error.response || error.code === 'ECONNABORTED' || error.message?.includes('Network Error'))) {
        return {
          success: false,
          errorCode: 'NETWORK_ERROR',
          message: 'Connexion impossible. Vérifiez votre connexion Internet et réessayez.',
          queued: true,
        };
      }

      return {
        success: false,
        errorCode: errorCode || 'VALIDATION_FAILED',
        message: message || 'Validation refusée.',
        rawMessage: message,
      };
    }
  },
};
