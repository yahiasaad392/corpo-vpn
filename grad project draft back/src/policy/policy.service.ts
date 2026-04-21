import { Injectable, BadRequestException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class PolicyService {
  private transporter: nodemailer.Transporter;

  constructor(private db: DatabaseService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // ── Helper: require caller to be admin ──
  private async requireAdmin(callerEmail: string) {
    const result = await this.db.pool.query(
      "SELECT role FROM auth_users WHERE email=$1",
      [callerEmail]
    );
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      throw new ForbiddenException("Access denied: Admins only");
    }
  }

  // ── Check if an email is in ANY policy ──
  async isEmailInPolicy(email: string): Promise<boolean> {
    const result = await this.db.pool.query(
      "SELECT id FROM vpn_policies WHERE $1 = ANY(emails) LIMIT 1",
      [email]
    );
    return result.rows.length > 0;
  }

  // ── Create Policy ──
  async createPolicy(callerEmail: string, dto: any) {
    await this.requireAdmin(callerEmail);

    const { companyName, maxUsers, sessionTimeout, emails, criticalChecks, warningChecks, infoChecks } = dto;

    if (!companyName || !maxUsers) {
      throw new BadRequestException("Company name and max users are required");
    }

    const result = await this.db.pool.query(
      `INSERT INTO vpn_policies (company_name, max_users, session_timeout, emails, critical_checks, warning_checks, info_checks, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        companyName,
        maxUsers,
        sessionTimeout || 3600,
        emails || [],
        criticalChecks || [],
        warningChecks || [],
        infoChecks || [],
        callerEmail,
      ]
    );

    console.log(`✅ Policy created for ${companyName} by ${callerEmail}`);
    return result.rows[0];
  }

  // ── Update Policy ──
  async updatePolicy(callerEmail: string, id: number, dto: any) {
    await this.requireAdmin(callerEmail);

    const { companyName, maxUsers, sessionTimeout, emails, criticalChecks, warningChecks, infoChecks } = dto;

    const result = await this.db.pool.query(
      `UPDATE vpn_policies
       SET company_name=$1, max_users=$2, session_timeout=$3, emails=$4,
           critical_checks=$5, warning_checks=$6, info_checks=$7, updated_at=NOW()
       WHERE id=$8
       RETURNING *`,
      [
        companyName,
        maxUsers,
        sessionTimeout || 3600,
        emails || [],
        criticalChecks || [],
        warningChecks || [],
        infoChecks || [],
        id,
      ]
    );

    if (result.rows.length === 0) {
      throw new HttpException("Policy not found", HttpStatus.NOT_FOUND);
    }

    console.log(`✅ Policy #${id} updated by ${callerEmail}`);
    return result.rows[0];
  }

  // ── Delete Policy ──
  async deletePolicy(callerEmail: string, id: number) {
    await this.requireAdmin(callerEmail);

    const result = await this.db.pool.query(
      "DELETE FROM vpn_policies WHERE id=$1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      throw new HttpException("Policy not found", HttpStatus.NOT_FOUND);
    }

    console.log(`✅ Policy #${id} deleted by ${callerEmail}`);
    return { message: `Policy #${id} deleted` };
  }

  // ── List All Policies (admin) ──
  async listPolicies(callerEmail: string) {
    await this.requireAdmin(callerEmail);

    const result = await this.db.pool.query(
      "SELECT * FROM vpn_policies ORDER BY created_at DESC"
    );
    return result.rows;
  }

  // ── Get policy for a specific user email ──
  async getMyPolicy(email: string) {
    const result = await this.db.pool.query(
      "SELECT * FROM vpn_policies WHERE $1 = ANY(emails) LIMIT 1",
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  // ── Notify admins about compliance failures (combined: critical + warning in one email) ──
  async notifyCompliance(userEmail: string, criticalFails: string[], warningFails: string[]) {
    const adminsResult = await this.db.pool.query(
      "SELECT email FROM auth_users WHERE role='admin'"
    );

    if (adminsResult.rows.length === 0) return { message: 'No admins to notify' };

    const adminEmails = adminsResult.rows.map(r => r.email);
    const hasCritical = criticalFails && criticalFails.length > 0;
    const hasWarning = warningFails && warningFails.length > 0;

    // Build subject
    const subject = hasCritical
      ? `🚨 BLOCKED: ${userEmail} failed compliance — ${criticalFails.length} critical, ${warningFails.length} warning`
      : `⚠️ WARNING: ${userEmail} connected with ${warningFails.length} compliance issue(s)`;

    // Build email body with sections
    let body = '';

    if (hasCritical) {
      body += `🚨 VPN COMPLIANCE ALERT\n\n`;
      body += `User: ${userEmail}\n`;
      body += `Status: CONNECTION BLOCKED\n\n`;
    } else {
      body += `⚠️ VPN COMPLIANCE WARNING\n\n`;
      body += `User: ${userEmail}\n`;
      body += `Status: CONNECTION ALLOWED (with warnings)\n\n`;
    }

    if (hasCritical) {
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      body += `🔴 CRITICAL CHECKS FAILED (${criticalFails.length})\n`;
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      criticalFails.forEach(c => { body += `  ✗ ${c}\n`; });
      body += `\n`;
    }

    if (hasWarning) {
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      body += `🟡 WARNING CHECKS FAILED (${warningFails.length})\n`;
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      warningFails.forEach(c => { body += `  ⚠ ${c}\n`; });
      body += `\n`;
    }

    if (hasCritical) {
      body += `Action Required: Please review this user's device and resolve the critical issues before they can reconnect.\n\n`;
    } else {
      body += `The user was allowed to connect, but the warning issues above should be reviewed.\n\n`;
    }

    body += `— Corpo VPN Security System`;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: adminEmails.join(', '),
        subject,
        text: body,
      });
      console.log(`✅ Compliance email sent to ${adminEmails.length} admin(s) about ${userEmail} [critical: ${criticalFails.length}, warning: ${warningFails.length}]`);
    } catch (e) {
      console.error('❌ Compliance email failed:', e.message);
    }

    return { message: 'Admins notified' };
  }
}
