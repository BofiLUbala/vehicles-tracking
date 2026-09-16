import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';
import { InviteAdminDto } from './dto/invite-admin.dto';

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

  @Roles(RoleName.SUPER_ADMIN)
  @Post('invitations')
  @ApiOperation({ summary: 'Inviter un administrateur dans son organisation' })
  invite(@CurrentUser() user: AuthenticatedPrincipal, @Body() dto: InviteAdminDto) {
    return this.users.invite(user.organizationId!, dto.email);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get(':id')
  @ApiOperation({ summary: "Détail d'un utilisateur admin" })
  findOne(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.users.findOne(user.organizationId!, id);
  }
}
