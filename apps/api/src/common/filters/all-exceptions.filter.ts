import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

/**
 * Filtre global : ne laisse jamais fuir de stack trace ni de détail interne au client,
 * et ne journalise jamais les corps de requête (qui peuvent contenir mots de passe/tokens/OTP).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttp ? exception.getResponse() : 'Erreur interne du serveur';

    if (!isHttp) {
      // On journalise le message d'erreur seulement (jamais le body de la requête).
      this.logger.error(exception instanceof Error ? exception.message : 'Erreur inconnue');
    }

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message ?? message,
      timestamp: new Date().toISOString(),
    });
  }
}
