import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception HTTP portant un code machine-lisible (`errorCode`) en plus du message humain.
 * Corps de réponse final : { statusCode, message, errorCode, timestamp } — voir
 * AllExceptionsFilter, qui propage `errorCode` s'il est présent sur le corps de l'exception.
 *
 * Utilisée pour tout le contrat d'erreurs de validation d'étape de mission
 * (voir mission-steps/mission-step-validation.errors.ts et docs/PHASE2_NOTES.md).
 */
export class CodedHttpException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    status: HttpStatus,
  ) {
    super({ errorCode, message }, status);
  }
}
