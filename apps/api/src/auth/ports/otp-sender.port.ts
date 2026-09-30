import { OtpChannel } from '@prisma/client';

/** Port d'envoi des codes OTP (e-mail, comptes admin) — stub ou live selon OTP_EMAIL_MODE. */
export interface OtpSenderPort {
  readonly channel: OtpChannel;
  send(identifier: string, code: string): Promise<void>;
}

export const OTP_SENDER_EMAIL = 'OTP_SENDER_EMAIL';
