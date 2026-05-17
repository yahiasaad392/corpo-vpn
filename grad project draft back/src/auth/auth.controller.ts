import { Controller, Post, Get, Body, Query } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Register: creates local user row after Supabase signup ──
  @Post("register")
  async register(@Body() body: any) {
    return this.authService.register(body.email);
  }

  // ── Sync: called after Supabase login to get role ──
  @Post("sync")
  async sync(@Body() body: any) {
    return this.authService.syncUser(body.email);
  }

  // ── Profile ──────────────────────────────────────────────
  @Get("me")
  async getProfile(@Query("email") email: string) {
    return this.authService.getUserProfile(email);
  }

  // ── Admin Management ─────────────────────────────────────
  @Post("add-admin")
  async addAdmin(@Body() body: any) {
    return this.authService.addAdmin(body.callerEmail, body.targetEmail);
  }

  @Post("remove-admin")
  async removeAdmin(@Body() body: any) {
    return this.authService.removeAdmin(body.callerEmail, body.targetEmail);
  }

  @Get("admins")
  async getAdmins(@Query("callerEmail") callerEmail: string) {
    return this.authService.getAdmins(callerEmail);
  }

  @Get("users")
  async getAllUsers(@Query("callerEmail") callerEmail: string) {
    return this.authService.getAllUsers(callerEmail);
  }

  @Get("audit-logs")
  async getAuditLogs(@Query("callerEmail") callerEmail: string) {
    return this.authService.getAuditLogs(callerEmail);
  }

  @Post("log-event")
  async logEvent(@Body() body: { email: string; action: string; details?: string }) {
    console.log(`[Security] User ${body.email || 'Unknown'} performed action: ${body.action} ${body.details ? `- ${body.details}` : ''}`);
    return { success: true };
  }

}
