import { Controller, Post, Get, Body, Ip, Query } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: any, @Ip() ip: string) {
    return this.authService.login(body.email, body.password, ip);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: any) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Post('resend-otp')
  async resendOtp(@Body() body: any) {
    return this.authService.resendOtp(body.email);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: any) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body);
  }

  @Post('change-password')
  async changePassword(@Body() body: any) {
    return this.authService.changePassword(body);
  }

  // ── Profile ──────────────────────────────────────────────
  @Get('me')
  async getProfile(@Query('email') email: string) {
    return this.authService.getUserProfile(email);
  }

  // ── Admin Management ─────────────────────────────────────
  @Post('add-admin')
  async addAdmin(@Body() body: any) {
    return this.authService.addAdmin(body.callerEmail, body.targetEmail);
  }

  @Post('remove-admin')
  async removeAdmin(@Body() body: any) {
    return this.authService.removeAdmin(body.callerEmail, body.targetEmail);
  }

  @Get('admins')
  async getAdmins(@Query('callerEmail') callerEmail: string) {
    return this.authService.getAdmins(callerEmail);
  }

  @Get('users')
  async getAllUsers(@Query('callerEmail') callerEmail: string) {
    return this.authService.getAllUsers(callerEmail);
  }
}
