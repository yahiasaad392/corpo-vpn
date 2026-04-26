import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { VpnService } from './vpn.service';

@Controller('api/vpn')
export class VpnController {
  constructor(private readonly vpnService: VpnService) {}

  /**
   * POST /api/vpn/connect
   * Called when user clicks "Connect" — after compliance scan passes.
   * Body: { email, complianceResults? }
   * Returns: { sessionId, privateKey, clientIp, connectedAt, complianceStatus }
   */
  @Post('connect')
  async connect(@Body() body: any) {
    return this.vpnService.connect(body.email, body.complianceResults || null);
  }

  /**
   * POST /api/vpn/disconnect
   * Called when user clicks "Disconnect" or when app closes.
   * Body: { email, sessionId? }
   * Returns: { message, disconnectedSessions }
   */
  @Post('disconnect')
  async disconnect(@Body() body: any) {
    return this.vpnService.disconnect(body.email, body.sessionId);
  }

  /**
   * GET /api/vpn/config?email=...
   * Returns user's stored WireGuard config (read-only).
   * Returns: { provisioned, privateKey?, clientIp?, rawConfig? }
   */
  @Get('config')
  async getConfig(@Query('email') email: string) {
    return this.vpnService.getConfig(email);
  }

  /**
   * POST /api/vpn/reprovision
   * Re-provisions a new WireGuard peer from the VPS (overwrites old config).
   * Body: { email }
   * Returns: { message, clientIp }
   */
  @Post('reprovision')
  async reprovision(@Body() body: any) {
    return this.vpnService.reprovision(body.email);
  }

  /**
   * GET /api/vpn/active-sessions?callerEmail=...
   * Admin-only: list currently active VPN sessions.
   */
  @Get('active-sessions')
  async activeSessions(@Query('callerEmail') callerEmail: string) {
    return this.vpnService.getActiveSessions(callerEmail);
  }

  /**
   * GET /api/vpn/session-history?callerEmail=...&limit=50
   * Admin-only: list recent VPN session history.
   */
  @Get('session-history')
  async sessionHistory(
    @Query('callerEmail') callerEmail: string,
    @Query('limit') limit: string,
  ) {
    return this.vpnService.getSessionHistory(callerEmail, parseInt(limit) || 50);
  }
}
