import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';
import * as otpGenerator from 'otp-generator';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;
  private vpsApi: string;

  constructor(private db: DatabaseService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    this.vpsApi = process.env.VPN_SERVER_API || 'http://80.65.211.27:3000';
  }

  // ── VPS: Provision a WireGuard peer and store in DB ──
  private async provisionVpnPeer(email: string): Promise<boolean> {
    try {
      console.log(`[Auth] Provisioning VPN peer for ${email} via ${this.vpsApi}`);
      const response = await fetch(`${this.vpsApi}/create-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.error(`[Auth] VPS returned ${response.status}`);
        return false;
      }

      const data = await response.json();
      let privateKey: string | null = null;
      let clientIp: string | null = null;
      let rawConfig: string = '';

      // Handle multiple VPS response formats
      if (data.config && typeof data.config === 'string') {
        rawConfig = data.config;
        const pkMatch = rawConfig.match(/PrivateKey\s*=\s*(.+)/);
        const addrMatch = rawConfig.match(/Address\s*=\s*([^\s/]+)/);
        if (pkMatch) privateKey = pkMatch[1].trim();
        if (addrMatch) clientIp = addrMatch[1].trim();
      }
      if (!privateKey && data.privateKey) privateKey = data.privateKey;
      if (!clientIp && data.address) clientIp = data.address.replace(/\/\d+$/, '');
      if (!clientIp && data.clientIp) clientIp = data.clientIp;
      if (!clientIp && data.client_ip) clientIp = data.client_ip;
      if (!privateKey && data.client?.privateKey) privateKey = data.client.privateKey;
      if (!clientIp && data.client?.address) clientIp = data.client.address.replace(/\/\d+$/, '');

      if (!privateKey || !clientIp) {
        console.error('[Auth] Could not parse VPS response:', JSON.stringify(data).substring(0, 200));
        return false;
      }

      if (!rawConfig) {
        rawConfig = `[Interface]\nPrivateKey = ${privateKey}\nAddress = ${clientIp}/24\nDNS = 1.1.1.1\n\n[Peer]\nEndpoint = 80.65.211.27:51820\nAllowedIPs = 0.0.0.0/0\nPersistentKeepalive = 25`;
      }

      await this.db.pool.query(
        'UPDATE auth_users SET wg_config=$1, wg_private_key=$2, wg_address=$3 WHERE email=$4',
        [rawConfig, privateKey, clientIp, email],
      );
      console.log(`[Auth] ✅ VPN peer provisioned for ${email} (IP: ${clientIp})`);
      return true;
    } catch (err) {
      console.error(`[Auth] ❌ VPN provisioning failed for ${email}:`, err.message);
      return false;
    }
  }

  async register(email: string, password: string) {
    try {
      console.log('--- Registering:', email);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
      const exemptEmails = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim()).filter(Boolean);

      if (!emailRegex.test(email)) {
        throw new BadRequestException('Invalid email format');
      }
      if (!exemptEmails.includes(email) && !passwordRegex.test(password)) {
        throw new BadRequestException('Password must be 8+ chars, have upper/lower/special characters');
      }

      const existingUser = await this.db.pool.query("SELECT password_hash, role FROM auth_users WHERE email=$1", [email]);
      const isPendingAdmin = existingUser.rows.length > 0 && existingUser.rows[0].password_hash === 'PENDING_REGISTRATION';

      // Check if email is in any company policy (only policy-listed emails can register)
      if (!exemptEmails.includes(email) && !isPendingAdmin) {
        const policyCheck = await this.db.pool.query(
          "SELECT id FROM vpn_policies WHERE $1 = ANY(emails) LIMIT 1",
          [email]
        );
        if (policyCheck.rows.length === 0) {
          throw new ForbiddenException('Your email is not associated with any organization. Contact your admin to be added to a VPN policy.');
        }
      }

      const hash = await bcrypt.hash(password, 10);
      
      if (existingUser.rows.length > 0) {
        if (isPendingAdmin) {
          await this.db.pool.query(
            "UPDATE auth_users SET password_hash=$1 WHERE email=$2",
            [hash, email]
          );
          console.log(`✅ Pending admin ${email} registered successfully`);
          return { message: "Admin account registered successfully" };
        } else {
          throw new HttpException('User already exists', HttpStatus.CONFLICT);
        }
      } else {
        // All new registrations are 'user' role by default
        await this.db.pool.query(
          "INSERT INTO auth_users(email, password_hash, role) VALUES($1, $2, 'user')",
          [email, hash]
        );
        console.log('✅ User registered successfully');

        // Auto-provision WireGuard peer from VPS (non-blocking)
        this.provisionVpnPeer(email).catch(err => {
          console.error('[Auth] Background VPN provisioning error:', err.message);
        });

        return { message: "User registered" };
      }
    } catch (error) {
      console.error('❌ Register Error:', error.message);
      if (error.code === '23505') throw new HttpException('User already exists', HttpStatus.CONFLICT);
      throw error;
    }
  }

  async forgotPassword(email: string) {
    console.log('--- Forgot Password:', email);
    const userResult = await this.db.pool.query("SELECT * FROM auth_users WHERE email=$1", [email]);
    if (userResult.rows.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
    const expire = new Date(Date.now() + 10 * 60000);

    await this.db.pool.query("DELETE FROM auth_otp_codes WHERE email=$1", [email]);
    await this.db.pool.query(
      "INSERT INTO auth_otp_codes(email, otp, expires_at, last_sent) VALUES($1, $2, $3, NOW())",
      [email, otp, expire]
    );

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "VPN Password Reset Code",
        text: `Your password reset code is ${otp}. It expires in 10 minutes.`
      });
      console.log('✅ Reset Email Sent');
    } catch (e) {
      console.error('❌ Email Error:', e);
      throw new HttpException("Error sending reset email", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return { message: "Reset code sent" };
  }

  async resetPassword(resetDto: any) {
    const { email, otp, newPassword } = resetDto;
    console.log('--- Resetting Password:', email);

    const otpResult = await this.db.pool.query(
      "SELECT * FROM auth_otp_codes WHERE email=$1 AND otp=$2",
      [email, otp]
    );

    if (otpResult.rows.length === 0) {
      throw new BadRequestException("Invalid reset code");
    }

    const record = otpResult.rows[0];
    if (new Date(record.expires_at) < new Date()) {
      throw new BadRequestException("Reset code expired");
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await this.db.pool.query("UPDATE auth_users SET password_hash=$1 WHERE email=$2", [hash, email]);
    await this.db.pool.query("DELETE FROM auth_otp_codes WHERE email=$1", [email]);

    console.log('✅ Password reset successfully');
    return { message: "Password updated" };
  }

  async changePassword(changeDto: any) {
    const { email, oldPassword, newPassword } = changeDto;
    console.log('--- Changing Password:', email);

    const userResult = await this.db.pool.query("SELECT * FROM auth_users WHERE email=$1", [email]);
    if (userResult.rows.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const dbUser = userResult.rows[0];
    const valid = await bcrypt.compare(oldPassword, dbUser.password_hash);
    if (!valid) {
      throw new UnauthorizedException("Incorrect current password");
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await this.db.pool.query("UPDATE auth_users SET password_hash=$1 WHERE email=$2", [hash, email]);

    console.log('✅ Password changed successfully');
    return { message: "Password updated" };
  }

  async login(email: string, password: string, ip: string) {
    try {
      console.log('--- Login Attempt:', email);
      const userResult = await this.db.pool.query(
        "SELECT * FROM auth_users WHERE email=$1",
        [email]
      );

      if (userResult.rows.length === 0) {
        throw new UnauthorizedException("User not found");
      }

      const dbUser = userResult.rows[0];

      if (dbUser.lock_until && new Date(dbUser.lock_until) > new Date()) {
        throw new ForbiddenException("Account locked");
      }

      const valid = await bcrypt.compare(password, dbUser.password_hash);

      if (!valid) {
        const attempts = (dbUser.failed_attempts || 0) + 1;
        if (attempts >= 5) {
          await this.db.pool.query(
            "UPDATE auth_users SET failed_attempts=$1, lock_until=NOW()+INTERVAL '15 minutes' WHERE email=$2",
            [attempts, email]
          );
          throw new ForbiddenException("Account locked for 15 minutes");
        }
        await this.db.pool.query(
          "UPDATE auth_users SET failed_attempts=$1 WHERE email=$2",
          [attempts, email]
        );
        throw new UnauthorizedException("Wrong password");
      }

      await this.db.pool.query(
        "UPDATE auth_users SET failed_attempts=0, lock_until=NULL WHERE email=$1",
        [email]
      );

      const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
      const expire = new Date(Date.now() + 2 * 60000);

      await this.db.pool.query("DELETE FROM auth_otp_codes WHERE email=$1", [email]);
      await this.db.pool.query(
        "INSERT INTO auth_otp_codes(email, otp, expires_at, last_sent) VALUES($1, $2, $3, NOW())",
        [email, otp, expire]
      );

      try {
        await this.transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Your VPN Login Code",
          text: `Your OTP code is ${otp}`
        });
        console.log('✅ OTP Email Sent');
      } catch (e) {
        console.error('❌ Email Error DETAILED:', e);
        throw new HttpException("Error sending email: " + e.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return { status: "OTP_SENT" };
    } catch (error) {
      console.error('❌ Login Error:', error.message);
      throw error;
    }
  }

  async verifyOtp(email: string, otp: string) {
    try {
      const result = await this.db.pool.query(
        "SELECT * FROM auth_otp_codes WHERE email=$1 AND otp=$2",
        [email, otp]
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedException("Invalid OTP");
      }

      const record = result.rows[0];
      if (new Date(record.expires_at) < new Date()) {
        throw new UnauthorizedException("OTP expired");
      }

      // Get the user's role from DB
      const userResult = await this.db.pool.query(
        "SELECT role FROM auth_users WHERE email=$1",
        [email]
      );
      const role = userResult.rows[0]?.role || 'user';

      // Auto-provision VPN config if user doesn't have one yet (existing users)
      const configCheck = await this.db.pool.query(
        'SELECT wg_private_key FROM auth_users WHERE email=$1',
        [email]
      );
      if (configCheck.rows.length > 0 && !configCheck.rows[0].wg_private_key) {
        console.log(`[Auth] User ${email} has no VPN config — auto-provisioning...`);
        this.provisionVpnPeer(email).catch(err => {
          console.error('[Auth] Background VPN provisioning error:', err.message);
        });
      }

      // Embed role in JWT so frontend knows immediately after login
      const token = jwt.sign(
        { user: email, role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: "7d" }
      );

      return { token, role };
    } catch (error) {
      console.error('❌ Verify Error:', error.message);
      throw error;
    }
  }

  async resendOtp(email: string) {
    try {
      const record = await this.db.pool.query(
        "SELECT last_sent FROM auth_otp_codes WHERE email=$1",
        [email]
      );

      if (record.rows.length > 0) {
        const last = new Date(record.rows[0].last_sent);
        const now = new Date();
        if ((now.getTime() - last.getTime()) / 1000 < 30) {
          throw new HttpException("Wait before requesting new OTP", HttpStatus.TOO_MANY_REQUESTS);
        }
      }

      const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
      const expire = new Date(Date.now() + 2 * 60000);

      await this.db.pool.query("DELETE FROM auth_otp_codes WHERE email=$1", [email]);
      await this.db.pool.query(
        "INSERT INTO auth_otp_codes(email, otp, expires_at, last_sent) VALUES($1, $2, $3, NOW())",
        [email, otp, expire]
      );

      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your VPN Login Code",
        text: `Your new OTP code is ${otp}`
      });

      return { status: "OTP_RESENT" };
    } catch (error) {
      console.error('❌ Resend Error:', error.message);
      throw error;
    }
  }

  // ── Admin Management ─────────────────────────────────────

  private async requireAdmin(callerEmail: string) {
    const result = await this.db.pool.query(
      "SELECT role FROM auth_users WHERE email=$1",
      [callerEmail]
    );
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      throw new ForbiddenException("Access denied: Admins only");
    }
  }

  async addAdmin(callerEmail: string, targetEmail: string) {
    await this.requireAdmin(callerEmail);

    const target = await this.db.pool.query(
      "SELECT id, role FROM auth_users WHERE email=$1",
      [targetEmail]
    );

    if (target.rows.length === 0) {
      // User doesn't exist yet — create them as admin pending registration
      await this.db.pool.query(
        "INSERT INTO auth_users(email, password_hash, role) VALUES($1, 'PENDING_REGISTRATION', 'admin')",
        [targetEmail]
      );
      console.log(`✅ ${targetEmail} created as admin (pending registration) by ${callerEmail}`);
      return { message: `${targetEmail} has been added as an admin. They can now register their account.` };
    }

    if (target.rows[0].role === 'admin') {
      throw new BadRequestException("User is already an admin");
    }

    await this.db.pool.query(
      "UPDATE auth_users SET role='admin' WHERE email=$1",
      [targetEmail]
    );
    console.log(`✅ ${targetEmail} promoted to admin by ${callerEmail}`);
    return { message: `${targetEmail} is now an admin` };
  }

  async removeAdmin(callerEmail: string, targetEmail: string) {
    await this.requireAdmin(callerEmail);

    if (callerEmail === targetEmail) {
      throw new BadRequestException("You cannot demote yourself");
    }
    if (targetEmail === process.env.ADMIN_EMAIL) {
      throw new BadRequestException("Cannot demote the root admin");
    }

    const target = await this.db.pool.query(
      "SELECT role FROM auth_users WHERE email=$1",
      [targetEmail]
    );
    if (target.rows.length === 0) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    await this.db.pool.query(
      "UPDATE auth_users SET role='user' WHERE email=$1",
      [targetEmail]
    );
    console.log(`✅ ${targetEmail} demoted to user by ${callerEmail}`);
    return { message: `${targetEmail} is now a regular user` };
  }

  async getAdmins(callerEmail: string) {
    await this.requireAdmin(callerEmail);
    const result = await this.db.pool.query(
      "SELECT email, created_at FROM auth_users WHERE role='admin' ORDER BY created_at ASC"
    );
    return result.rows;
  }

  async getAllUsers(callerEmail: string) {
    await this.requireAdmin(callerEmail);
    const result = await this.db.pool.query(
      "SELECT id, email, role, created_at FROM auth_users ORDER BY created_at DESC"
    );
    return result.rows;
  }

  async getUserProfile(email: string) {
    const result = await this.db.pool.query(
      "SELECT id, email, role, created_at FROM auth_users WHERE email=$1",
      [email]
    );
    if (result.rows.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return result.rows[0];
  }
}
