import { Controller, Post, Get, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PolicyService } from './policy.service';

@Controller('api/policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  // ── Check if email is in any policy (for registration gating) ──
  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    const exists = await this.policyService.isEmailInPolicy(email);
    return { allowed: exists };
  }

  // ── Create Policy (admin-only) ──
  @Post('create')
  async create(@Body() body: any) {
    return this.policyService.createPolicy(body.callerEmail, body);
  }

  // ── Update Policy (admin-only) ──
  @Put('update/:id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.policyService.updatePolicy(body.callerEmail, parseInt(id), body);
  }

  // ── Delete Policy (admin-only) ──
  @Delete('delete/:id')
  async remove(@Param('id') id: string, @Body() body: any) {
    return this.policyService.deletePolicy(body.callerEmail, parseInt(id));
  }

  // ── List All Policies (admin-only) ──
  @Get('list')
  async list(@Query('callerEmail') callerEmail: string) {
    return this.policyService.listPolicies(callerEmail);
  }

  // ── Get policy for current user ──
  @Get('my-policy')
  async myPolicy(@Query('email') email: string) {
    const policy = await this.policyService.getMyPolicy(email);
    if (!policy) return { found: false };
    return { found: true, policy };
  }

  // ── Notify admins about compliance failures (one combined email) ──
  @Post('notify-warning')
  async notifyWarning(@Body() body: any) {
    return this.policyService.notifyCompliance(
      body.userEmail,
      body.criticalFails || [],
      body.warningFails || [],
    );
  }
}
