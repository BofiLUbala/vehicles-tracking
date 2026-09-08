import { Injectable, Logger } from '@nestjs/common';
import { OtpChannel } from '@prisma/client';
import { OtpSenderPort } from '../ports/otp-sender.port';

@Injectable()
export class StubEmailSender implements OtpSenderPort {
  readonly channel = OtpChannel.EMAIL;
  private readonly logger = new Logger('StubEmailSender');
  private readonly lastCodes = new Map<string, string>();

  async send(identifier: string, code: string): Promise<void> {
    this.lastCodes.set(identifier, code);
    this.logger.log(`[DEV STUB] Code OTP e-mail pour ${identifier} : ${code}`);
  }

  getLastCode(identifier: string): string | undefined {
    return this.lastCodes.get(identifier);
  }
}
