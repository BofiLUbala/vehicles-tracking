import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminVerifyOtpDto } from './dto/admin-verify-otp.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('otp/request')
  @ApiOperation({ summary: "Demander un code OTP (chauffeur, connexion par téléphone)" })
  @ApiResponse({ status: 201, description: 'Code envoyé (réponse générique, ne confirme pas l\'existence du compte)' })
  requestOtp(@Body() dto: RequestOtpDto, @Ip() ip: string) {
    return this.auth.requestOtp(dto, ip);
  }

  @Public()
  @Post('otp/verify')
  @ApiOperation({ summary: 'Vérifier le code OTP et obtenir les tokens (chauffeur)' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Public()
  @Post('otp/resend')
  @ApiOperation({ summary: 'Renvoyer un code OTP (soumis à un délai anti-spam)' })
  resendOtp(@Body() dto: ResendOtpDto, @Ip() ip: string) {
    return this.auth.resendOtp(dto, ip);
  }

  @Public()
  @Post('admin/login')
  @ApiOperation({ summary: 'Connexion admin par mot de passe (OTP e-mail requis pour un nouvel appareil)' })
  adminLogin(@Body() dto: AdminLoginDto, @Ip() ip: string) {
    return this.auth.adminLogin(dto, ip);
  }

  @Public()
  @Post('admin/verify-otp')
  @ApiOperation({ summary: "Vérifier l'OTP admin (nouvel appareil) et obtenir les tokens" })
  adminVerifyOtp(@Body() dto: AdminVerifyOtpDto) {
    return this.auth.adminVerifyOtp(dto);
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
