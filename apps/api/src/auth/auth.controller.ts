import { Body, Controller, Get, GoneException, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { DriverLoginDto } from './dto/driver-login.dto';
import {
  ActivateDriverDto,
  ConfirmDriverPasswordResetDto,
  DriverInvitationLookupDto,
  RequestDriverPasswordResetDto,
} from './dto/driver-activation.dto';
import { RequestPasswordResetDto, VerifyPasswordResetDto } from './dto/password-reset.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestAdminActivationDto, VerifyAdminActivationDto } from './dto/activate-admin.dto';
import { RequestSuperAdminRegistrationDto, VerifySuperAdminRegistrationDto } from './dto/register-super-admin.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

/**
 * Les chauffeurs ne reçoivent plus de code : ils activent leur compte et réinitialisent leur mot de
 * passe par des liens envoyés par e-mail. Les anciennes routes restent pour répondre clairement aux
 * versions précédentes de l'application.
 */
const DRIVER_CODE_GONE_MESSAGE =
  'L’activation par code n’existe plus. Mettez à jour l’application, puis ouvrez le lien « Activer mon compte » reçu par e-mail.';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('otp/request')
  @ApiOperation({ summary: 'Supprimé : les chauffeurs activent leur compte par le lien reçu par e-mail' })
  @ApiResponse({ status: 410 })
  requestOtp(): never {
    throw new GoneException(DRIVER_CODE_GONE_MESSAGE);
  }

  @Public()
  @Post('otp/verify')
  @ApiOperation({ summary: 'Supprimé : les chauffeurs activent leur compte par le lien reçu par e-mail' })
  @ApiResponse({ status: 410 })
  verifyOtp(): never {
    throw new GoneException(DRIVER_CODE_GONE_MESSAGE);
  }

  @Public()
  @Post('otp/resend')
  @ApiOperation({ summary: 'Supprimé : les chauffeurs activent leur compte par le lien reçu par e-mail' })
  @ApiResponse({ status: 410 })
  resendOtp(): never {
    throw new GoneException(DRIVER_CODE_GONE_MESSAGE);
  }

  @Public()
  @Post('driver/login')
  @ApiOperation({ summary: 'Connexion chauffeur par identifiant + mot de passe (sans OTP)' })
  driverLogin(@Body() dto: DriverLoginDto, @Ip() ip: string) {
    return this.auth.driverLogin(dto, ip);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('driver/invitation')
  @ApiOperation({ summary: 'Lire l’invitation chauffeur associée au lien reçu par e-mail' })
  @ApiResponse({ status: 410, description: 'Lien invalide, expiré ou déjà utilisé' })
  driverInvitation(@Body() dto: DriverInvitationLookupDto) {
    return this.auth.getDriverInvitation(dto);
  }

  @Public()
  @Post('driver/activate')
  @ApiOperation({ summary: 'Activer le compte chauffeur depuis le lien d’invitation (choix du mot de passe)' })
  @ApiResponse({ status: 410, description: 'Lien invalide, expiré ou déjà utilisé' })
  activateDriver(@Body() dto: ActivateDriverDto, @Ip() ip: string) {
    return this.auth.activateDriver(dto, ip);
  }

  @Public()
  @Post('driver/password-reset/request')
  @ApiOperation({ summary: 'Mot de passe oublié (chauffeur) : envoyer un lien de réinitialisation par e-mail' })
  @ApiResponse({ status: 201, description: 'Réponse générique, ne confirme pas l\'existence du compte' })
  requestDriverPasswordReset(@Body() dto: RequestDriverPasswordResetDto, @Ip() ip: string) {
    return this.auth.requestDriverPasswordReset(dto, ip);
  }

  @Public()
  @Post('driver/password-reset/confirm')
  @ApiOperation({ summary: 'Définir le nouveau mot de passe chauffeur depuis le lien reçu par e-mail' })
  @ApiResponse({ status: 410, description: 'Lien invalide, expiré ou déjà utilisé' })
  confirmDriverPasswordReset(@Body() dto: ConfirmDriverPasswordResetDto, @Ip() ip: string) {
    return this.auth.confirmDriverPasswordReset(dto, ip);
  }

  @Public()
  @Post('password-reset/request')
  @ApiOperation({ summary: 'Demander un code OTP de récupération de mot de passe (compte admin)' })
  @ApiResponse({ status: 201, description: 'Réponse générique, ne confirme pas l\'existence du compte' })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto, @Ip() ip: string) {
    return this.auth.requestPasswordReset(dto, ip);
  }

  @Public()
  @Post('password-reset/verify')
  @ApiOperation({ summary: 'Vérifier le code de récupération et définir un nouveau mot de passe (compte admin)' })
  verifyPasswordReset(@Body() dto: VerifyPasswordResetDto, @Ip() ip: string) {
    return this.auth.verifyPasswordReset(dto, ip);
  }

  @Public()
  @Post('admin/login')
  @ApiOperation({ summary: 'Connexion admin par e-mail + mot de passe (sans OTP)' })
  adminLogin(@Body() dto: AdminLoginDto, @Ip() ip: string) {
    return this.auth.adminLogin(dto, ip);
  }

  @Public()
  @Post('admin/activate/request')
  @ApiOperation({ summary: "Demander l’OTP d’activation d’un compte admin invité" })
  requestAdminActivation(@Body() dto: RequestAdminActivationDto, @Ip() ip: string) {
    return this.auth.requestAdminActivation(dto, ip);
  }

  @Public()
  @Post('admin/activate/verify')
  @ApiOperation({ summary: "Valider l’OTP et activer le compte admin invité" })
  verifyAdminActivation(@Body() dto: VerifyAdminActivationDto) {
    return this.auth.verifyAdminActivation(dto);
  }

  @Public()
  @Post('admin/register/request')
  @ApiOperation({ summary: "Demander l’OTP de création d’un compte Super Master" })
  requestSuperAdminRegistration(@Body() dto: RequestSuperAdminRegistrationDto, @Ip() ip: string) {
    return this.auth.requestSuperAdminRegistration(dto, ip);
  }

  @Public()
  @Post('admin/register/verify')
  @ApiOperation({ summary: "Valider l’OTP et créer le compte Super Master et son organisation" })
  verifySuperAdminRegistration(@Body() dto: VerifySuperAdminRegistrationDto) {
    return this.auth.verifySuperAdminRegistration(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: "Renouveler les tokens à partir d'un refresh token (rotation)" })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Invalider la session associée au refresh token' })
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto);
  }

  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: "Profil de l'utilisateur ou du chauffeur authentifié" })
  profile(@CurrentUser() user: AuthenticatedPrincipal) {
    return this.auth.getProfile(user);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @ApiOperation({ summary: "Changer le mot de passe (compte admin)" })
  changePassword(@CurrentUser() user: AuthenticatedPrincipal, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, dto);
  }
}
