import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { DriverLoginDto } from './dto/driver-login.dto';
import { RequestPasswordResetDto, VerifyPasswordResetDto } from './dto/password-reset.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestAdminActivationDto, VerifyAdminActivationDto } from './dto/activate-admin.dto';
import { RequestSuperAdminRegistrationDto, VerifySuperAdminRegistrationDto } from './dto/register-super-admin.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('otp/request')
  @ApiOperation({ summary: "Demander un code OTP d’activation (inscription chauffeur, mode SIGN_UP uniquement)" })
  @ApiResponse({ status: 201, description: 'Code envoyé (réponse générique, ne confirme pas l\'existence du compte)' })
  @ApiResponse({ status: 410, description: 'La connexion par code n’existe plus (mode LOGIN désactivé)' })
  requestOtp(@Body() dto: RequestOtpDto, @Ip() ip: string) {
    return this.auth.requestOtp(dto, ip);
  }

  @Public()
  @Post('otp/verify')
  @ApiOperation({ summary: 'Vérifier le code OTP d’activation et obtenir les tokens (inscription chauffeur)' })
  @ApiResponse({ status: 410, description: 'La connexion par code n’existe plus (mode LOGIN désactivé)' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Public()
  @Post('otp/resend')
  @ApiOperation({ summary: 'Renvoyer un code OTP d’activation (soumis à un délai anti-spam)' })
  resendOtp(@Body() dto: ResendOtpDto, @Ip() ip: string) {
    return this.auth.resendOtp(dto, ip);
  }

  @Public()
  @Post('driver/login')
  @ApiOperation({ summary: 'Connexion chauffeur par identifiant + mot de passe (sans OTP)' })
  driverLogin(@Body() dto: DriverLoginDto, @Ip() ip: string) {
    return this.auth.driverLogin(dto, ip);
  }

  @Public()
  @Post('password-reset/request')
  @ApiOperation({ summary: 'Demander un code OTP de récupération de mot de passe' })
  @ApiResponse({ status: 201, description: 'Réponse générique, ne confirme pas l\'existence du compte' })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto, @Ip() ip: string) {
    return this.auth.requestPasswordReset(dto, ip);
  }

  @Public()
  @Post('password-reset/verify')
  @ApiOperation({ summary: 'Vérifier le code de récupération et définir un nouveau mot de passe' })
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
