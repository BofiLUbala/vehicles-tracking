import { OtpChannel } from '@prisma/client';

/** Port d'envoi OTP — une implémentation par canal, sélectionnée via OTP_CHANNEL_MODE (stub|live). */
export interface OtpSenderPort {
  readonly channel: OtpChannel;
  send(identifier: string, code: string): Promise<void>;
}

export const OTP_SENDER_WHATSAPP = 'OTP_SENDER_WHATSAPP';
export const OTP_SENDER_EMAIL = 'OTP_SENDER_EMAIL';
