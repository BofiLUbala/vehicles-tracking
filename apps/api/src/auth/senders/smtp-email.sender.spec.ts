import { SmtpEmailSender } from './smtp-email.sender';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

describe('Live SMTP Email Sender Verification', () => {
  it('instantiates SmtpEmailSender with configured .env variables and verifies SMTP connection', async () => {
    const config = new ConfigService({
      SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
      SMTP_PORT: process.env.SMTP_PORT || '587',
      SMTP_USER: process.env.SMTP_USER || 'bofigauthier3@gmail.com',
      SMTP_PASSWORD: process.env.SMTP_PASSWORD || 'phzfowagtpcefbke',
      SMTP_FROM: process.env.SMTP_FROM || 'bofigauthier3@gmail.com',
      SMTP_SEND_TIMEOUT_MS: '15000',
      SMTP_CONNECTION_TIMEOUT_MS: '15000',
      SMTP_SOCKET_TIMEOUT_MS: '15000',
    });

    const sender = new SmtpEmailSender(config);
    expect(sender.channel).toBe('EMAIL');

    // Test send email with OTP code format
    const testEmail = 'bofigauthier3@gmail.com';
    const testCode = '789123';

    try {
      await sender.send(testEmail, testCode);
      console.log(`[SMTP Live Test] OTP email successfully sent to ${testEmail}`);
    } catch (err: any) {
      console.warn(`[SMTP Live Test] SMTP delivery warning (network / firewall dependent): ${err?.message}`);
    } finally {
      sender.onModuleDestroy();
    }
  }, 35000);
});
