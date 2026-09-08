import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RoleName } from '@prisma/client';
import { MissionStepsService } from './mission-steps.service';
import { ValidateStepMetadataDto } from './dto/validate-step-metadata.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentDriver, CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo

@ApiTags('mission-steps')
@ApiBearerAuth()
@Controller('mission-steps')
export class MissionStepsController {
  constructor(private readonly missionSteps: MissionStepsService) {}

  @Roles(RoleName.DRIVER)
  @Post(':id/validate')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "Valider une étape (QR + GPS + tolérance temporelle + photo) — chauffeur affecté uniquement" })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        metadata: { type: 'string', description: 'JSON stringifié — voir ValidateStepMetadataDto' },
        photo: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage(), limits: { fileSize: MAX_PHOTO_SIZE_BYTES } }))
  async validate(
    @CurrentDriver() driver: AuthenticatedPrincipal,
    @Param('id') id: string,
    @Body('metadata') rawMetadata: string,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    const dto = await this.parseAndValidateMetadata(rawMetadata);
    return this.missionSteps.validate(driver.sub, id, dto, photo);
  }

  @Get(':id/evidence')
  @ApiOperation({ summary: "Preuve de validation d'une étape (métadonnées + URL signée de la photo)" })
  evidence(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.missionSteps.getEvidence(user, id);
  }

  /** Le champ "metadata" est un JSON stringifié (contrainte multipart/form-data) — parsing + validation manuels. */
  private async parseAndValidateMetadata(raw: string): Promise<ValidateStepMetadataDto> {
    if (!raw) {
      throw new BadRequestException('Le champ "metadata" (JSON) est requis');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Le champ "metadata" doit être un JSON valide');
    }
    const dto = plainToInstance(ValidateStepMetadataDto, parsed);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: false });
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Métadonnées de validation invalides',
        details: errors.map((e) => ({ property: e.property, constraints: e.constraints })),
      });
    }
    return dto;
  }
}
