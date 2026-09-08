import { BadRequestException, Body, Controller, Get, Param, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RoleName } from '@prisma/client';
import { FuelService } from './fuel.service';
import { CreateFuelRecordMetadataDto } from './dto/create-fuel-record-metadata.dto';
import { QueryFuelRecordsDto } from './dto/query-fuel-records.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentDriver, CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo

@ApiTags('fuel-records')
@ApiBearerAuth()
@Controller('fuel-records')
export class FuelRecordsController {
  constructor(private readonly fuel: FuelService) {}

  @Roles(RoleName.DRIVER)
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Déclarer un plein de carburant (reçu + photo compteur) — chauffeur affecté au véhicule uniquement' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        metadata: { type: 'string', description: 'JSON stringifié — voir CreateFuelRecordMetadataDto' },
        receipt: { type: 'string', format: 'binary' },
        odometerPhoto: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'receipt', maxCount: 1 },
        { name: 'odometerPhoto', maxCount: 1 },
      ],
      { storage: memoryStorage(), limits: { fileSize: MAX_PHOTO_SIZE_BYTES } },
    ),
  )
  async create(
    @CurrentDriver() driver: AuthenticatedPrincipal,
    @Body('metadata') rawMetadata: string,
    @UploadedFiles() files: { receipt?: Express.Multer.File[]; odometerPhoto?: Express.Multer.File[] },
  ) {
    const dto = await this.parseAndValidateMetadata(rawMetadata);
    return this.fuel.create(driver.sub, driver.organizationId!, dto, files?.receipt?.[0], files?.odometerPhoto?.[0]);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: "Liste des déclarations de carburant de l'organisation, filtrable par véhicule/chauffeur/période" })
  findAll(@CurrentUser() user: AuthenticatedPrincipal, @Query() query: QueryFuelRecordsDto) {
    return this.fuel.findAll(user.organizationId!, query);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get(':id')
  @ApiOperation({ summary: "Détail d'une déclaration de carburant" })
  findOne(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.fuel.findOne(user.organizationId!, id);
  }

  /** Le champ "metadata" est un JSON stringifié (contrainte multipart/form-data) — parsing + validation manuels. */
  private async parseAndValidateMetadata(raw: string): Promise<CreateFuelRecordMetadataDto> {
    if (!raw) {
      throw new BadRequestException('Le champ "metadata" (JSON) est requis');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Le champ "metadata" doit être un JSON valide');
    }
    const dto = plainToInstance(CreateFuelRecordMetadataDto, parsed);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: false });
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Métadonnées de déclaration de carburant invalides',
        details: errors.map((e) => ({ property: e.property, constraints: e.constraints })),
      });
    }
    return dto;
  }
}
