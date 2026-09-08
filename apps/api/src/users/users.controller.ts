import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Lister les utilisateurs admin de l\'organisation' })
  findAll(@CurrentUser() user: AuthenticatedPrincipal) {
    return this.users.findAll(user.organizationId!);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get(':id')
  @ApiOperation({ summary: "Détail d'un utilisateur admin" })
  findOne(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.users.findOne(user.organizationId!, id);
  }
}
