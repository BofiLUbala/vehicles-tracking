import { Controller, ForbiddenException, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService, private readonly prisma: PrismaService) {}

  @Get(':id/signed-url')
  @ApiOperation({ summary: "URL signée (courte durée) pour télécharger un fichier — jamais d'accès public permanent" })
  async signedUrl(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    const file = await this.files.findOne(id);
    await this.assertCanAccess(user, file);
    return this.files.signedGetUrl(id);
  }

  /**
   * Un fichier n'a pas d'organizationId propre (il est polymorphe via relatedTo/relatedId) : on
   * retrouve l'organisation via le chauffeur qui a uploadé le fichier. Le chauffeur propriétaire
   * peut toujours accéder à ses propres fichiers ; un admin/super-admin uniquement s'il appartient
   * à la même organisation que ce chauffeur.
   */
  private async assertCanAccess(user: AuthenticatedPrincipal, file: { uploadedById: string | null }) {
    if (user.type === 'driver') {
      if (file.uploadedById !== user.sub) {
        throw new ForbiddenException("Ce fichier n'appartient pas à ce chauffeur");
      }
      return;
    }

    // Admin / super-admin : scoping par organisation.
    if (!file.uploadedById) {
      throw new ForbiddenException('Fichier non accessible');
    }
    const driver = await this.prisma.driver.findUnique({ where: { id: file.uploadedById } });
    if (!driver || driver.organizationId !== user.organizationId) {
      throw new ForbiddenException('Fichier non accessible');
    }
  }
}
