import { apiClient } from './client';
import { CreateFuelRecordMetadataDto, FuelRecordResponse, FuelSubmissionResult } from '../types/fuel.types';

export interface SubmitFuelParams {
  metadata: CreateFuelRecordMetadataDto;
  receiptUri: string;
  odometerPhotoUri: string;
}

export const FuelApi = {
  async submitFuelRecord(params: SubmitFuelParams): Promise<FuelSubmissionResult> {
    try {
      const formData = new FormData();

      formData.append('metadata', JSON.stringify(params.metadata));

      const receiptFilename = params.receiptUri.split('/').pop() || `receipt_${params.metadata.vehicleId}.jpg`;
      formData.append('receipt', {
        uri: params.receiptUri,
        name: receiptFilename,
        type: 'image/jpeg',
      } as any);

      const odoFilename = params.odometerPhotoUri.split('/').pop() || `odometer_${params.metadata.vehicleId}.jpg`;
      formData.append('odometerPhoto', {
        uri: params.odometerPhotoUri,
        name: odoFilename,
        type: 'image/jpeg',
      } as any);

      const response = await apiClient.post<FuelRecordResponse>('/fuel-records', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        anomalies: response.data.anomalies,
      };
    } catch (error: any) {
      const responseData = error.response?.data;
      const errorCode = responseData?.errorCode;
      const message = responseData?.message;

      if (!errorCode && (!error.response || error.code === 'ECONNABORTED' || error.message?.includes('Network Error'))) {
        return {
          success: false,
          errorCode: 'NETWORK_ERROR',
          message: 'Connexion impossible. Déclaration enregistrée localement.',
          queued: true,
        };
      }

      return {
        success: false,
        errorCode: errorCode || 'FUEL_SUBMISSION_FAILED',
        message: message || 'Déclaration refusée par le serveur.',
      };
    }
  },
};
