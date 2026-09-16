import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ZoneKind } from '@prisma/client';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Polygone d'une zone, en coordonnées GeoJSON `[longitude, latitude]` (ordre GeoJSON, comme
 * PostGIS — l'inverse de l'ordre courant « latitude, longitude »).
 *
 * La fermeture de l'anneau (premier point == dernier point) n'est pas exigée de l'appelant :
 * `ZonesService` la normalise, pour que l'interface d'administration puisse envoyer simplement les
 * sommets cliqués sur la carte.
 */
export class CreateZoneDto {
  @ApiProperty({ example: 'Périmètre Kinshasa' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ enum: ZoneKind, default: ZoneKind.ALLOWED })
  @IsOptional()
  @IsEnum(ZoneKind)
  kind?: ZoneKind;

  @ApiProperty({
    description: 'Sommets du polygone : [[longitude, latitude], ...] — au moins 3 sommets distincts.',
    example: [
      [15.2, -4.4],
      [15.4, -4.4],
      [15.4, -4.2],
      [15.2, -4.2],
    ],
  })
  @IsArray()
  @ArrayMinSize(3)
  coordinates!: number[][];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
