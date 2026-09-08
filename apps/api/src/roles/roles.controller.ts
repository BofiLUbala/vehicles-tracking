import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { RolesService } from './roles.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Roles(RoleName.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Lister les rôles disponibles' })
  findAll() {
    return this.roles.findAll();
  }
}
