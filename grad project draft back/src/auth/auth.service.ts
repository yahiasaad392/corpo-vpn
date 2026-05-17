import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getPersistedLogs } from "../system-logs";


@Injectable()
export class AuthService {
  private supabase: SupabaseClient;
  private vpsApi: string;

  constructor(private db: DatabaseService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    );
    this.vpsApi = process.env.VPN_SERVER_API || "http://80.65.211.27:3000";
  }

  // ── VPS: Provision a WireGuard peer and store in DB ──
  private async provisionVpnPeer(email: string): Promise<boolean> {
    try {
      console.log(
        `[Auth] Provisioning VPN peer for ${email} via ${this.vpsApi}`,
      );
      const response = await fetch(`${this.vpsApi}/create-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.error(`[Auth] VPS returned ${response.status}`);
        return false;
      }

      const data = await response.json();
      let privateKey: string | null = null;
      let clientIp: string | null = null;
      let rawConfig: string = "";

      // Handle multiple VPS response formats
      if (data.config && typeof data.config === "string") {
        rawConfig = data.config;
        const pkMatch = rawConfig.match(/PrivateKey\s*=\s*(.+)/);
        const addrMatch = rawConfig.match(/Address\s*=\s*([^\s/]+)/);
        if (pkMatch) privateKey = pkMatch[1].trim();
        if (addrMatch) clientIp = addrMatch[1].trim();
      }
      if (!privateKey && data.privateKey) privateKey = data.privateKey;
      if (!clientIp && data.address)
        clientIp = data.address.replace(/\/\d+$/, "");
      if (!clientIp && data.clientIp) clientIp = data.clientIp;
      if (!clientIp && data.client_ip) clientIp = data.client_ip;
      if (!privateKey && data.client?.privateKey)
        privateKey = data.client.privateKey;
      if (!clientIp && data.client?.address)
        clientIp = data.client.address.replace(/\/\d+$/, "");

      if (!privateKey || !clientIp) {
        console.error(
          "[Auth] Could not parse VPS response:",
          JSON.stringify(data).substring(0, 200),
        );
        return false;
      }

      if (!rawConfig) {
        rawConfig = `[Interface]\nPrivateKey = ${privateKey}\nAddress = ${clientIp}/24\nDNS = 1.1.1.1\n\n[Peer]\nEndpoint = 80.65.211.27:51820\nAllowedIPs = 0.0.0.0/0\nPersistentKeepalive = 25`;
      }

      await this.db.pool.query(
        "UPDATE auth_users SET wg_config=$1, wg_private_key=$2, wg_address=$3 WHERE email=$4",
        [rawConfig, privateKey, clientIp, email],
      );
      console.log(
        `[Auth] ✅ VPN peer provisioned for ${email} (IP: ${clientIp})`,
      );
      return true;
    } catch (err) {
      console.error(
        `[Auth] ❌ VPN provisioning failed for ${email}:`,
        err.message,
      );
      return false;
    }
  }

  // ── Register: Create local user row + provision VPN ──
  // Supabase signup is handled on the frontend; this creates the app-level record
  async register(email: string) {
    try {
      console.log("--- Registering local user:", email);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const exemptEmails = (process.env.ADMIN_EMAIL || "")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      if (!emailRegex.test(email)) {
        throw new BadRequestException("Invalid email format");
      }

      const existingUser = await this.db.pool.query(
        "SELECT password_hash, role FROM auth_users WHERE email=$1",
        [email],
      );
      const isPendingAdmin =
        existingUser.rows.length > 0 &&
        existingUser.rows[0].password_hash === "PENDING_REGISTRATION";

      // Check if email is in any company policy (only policy-listed emails can register)
      if (!exemptEmails.includes(email) && !isPendingAdmin) {
        const policyCheck = await this.db.pool.query(
          "SELECT id FROM vpn_policies WHERE $1 = ANY(emails) LIMIT 1",
          [email],
        );
        if (policyCheck.rows.length === 0) {
          throw new ForbiddenException(
            "Your email is not associated with any organization. Contact your admin to be added to a VPN policy.",
          );
        }
      }

      if (existingUser.rows.length > 0) {
        if (isPendingAdmin) {
          await this.db.pool.query(
            "UPDATE auth_users SET password_hash='SUPABASE_AUTH' WHERE email=$1",
            [email],
          );
          console.log(`✅ Pending admin ${email} registered successfully`);
          return { message: "Admin account registered successfully" };
        } else if (existingUser.rows[0].password_hash === "SUPABASE_AUTH") {
          // Already synced — just return success
          return { message: "User already registered" };
        } else {
          // Migration: existing user from old auth system → update to Supabase Auth
          // Keep their existing role (could be admin)
          await this.db.pool.query(
            "UPDATE auth_users SET password_hash='SUPABASE_AUTH' WHERE email=$1",
            [email],
          );
          console.log(
            `✅ Migrated existing user ${email} to Supabase Auth (role: ${existingUser.rows[0].role})`,
          );
          return { message: "Account migrated to new auth system" };
        }
      } else {
        // All new registrations are 'user' role by default
        await this.db.pool.query(
          "INSERT INTO auth_users(email, password_hash, role) VALUES($1, 'SUPABASE_AUTH', 'user')",
          [email],
        );
        console.log("✅ User registered successfully");

        // Auto-provision WireGuard peer from VPS (non-blocking)
        this.provisionVpnPeer(email).catch((err) => {
          console.error(
            "[Auth] Background VPN provisioning error:",
            err.message,
          );
        });

        return { message: "User registered" };
      }
    } catch (error) {
      console.error("❌ Register Error:", error.message);
      if (error.code === "23505")
        throw new HttpException("User already exists", HttpStatus.CONFLICT);
      throw error;
    }
  }

  // ── Sync: Called after Supabase login to get/create local user + return role ──
  async syncUser(email: string) {
    const existing = await this.db.pool.query(
      "SELECT id, role, wg_private_key FROM auth_users WHERE email=$1",
      [email],
    );

    if (existing.rows.length === 0) {
      // First-time login — create local record
      const exemptEmails = (process.env.ADMIN_EMAIL || "")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      const role = exemptEmails.includes(email) ? "admin" : "user";

      await this.db.pool.query(
        "INSERT INTO auth_users(email, password_hash, role) VALUES($1, 'SUPABASE_AUTH', $2)",
        [email, role],
      );

      // Auto-provision VPN peer (non-blocking)
      this.provisionVpnPeer(email).catch((err) => {
        console.error("[Auth] Background VPN provisioning error:", err.message);
      });

      console.log(`✅ Local user synced: ${email} (role: ${role})`);
      return { role };
    }

    // Auto-provision VPN config if user doesn't have one yet
    if (!existing.rows[0].wg_private_key) {
      console.log(
        `[Auth] User ${email} has no VPN config — auto-provisioning...`,
      );
      this.provisionVpnPeer(email).catch((err) => {
        console.error("[Auth] Background VPN provisioning error:", err.message);
      });
    }

    return { role: existing.rows[0].role };
  }

  // ── Verify Supabase Token (used by JWT guard) ──
  async verifySupabaseToken(token: string) {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user;
  }

  // ── Admin Management ─────────────────────────────────────

  private async requireAdmin(callerEmail: string) {
    const result = await this.db.pool.query(
      "SELECT role FROM auth_users WHERE email=$1",
      [callerEmail],
    );
    if (result.rows.length === 0 || result.rows[0].role !== "admin") {
      throw new ForbiddenException("Access denied: Admins only");
    }
  }

  async addAdmin(callerEmail: string, targetEmail: string) {
    await this.requireAdmin(callerEmail);

    const target = await this.db.pool.query(
      "SELECT id, role FROM auth_users WHERE email=$1",
      [targetEmail],
    );

    if (target.rows.length === 0) {
      // User doesn't exist yet — create them as admin pending registration
      await this.db.pool.query(
        "INSERT INTO auth_users(email, password_hash, role) VALUES($1, 'PENDING_REGISTRATION', 'admin')",
        [targetEmail],
      );
      console.log(
        `✅ ${targetEmail} created as admin (pending registration) by ${callerEmail}`,
      );
      return {
        message: `${targetEmail} has been added as an admin. They can now register their account.`,
      };
    }

    if (target.rows[0].role === "admin") {
      throw new BadRequestException("User is already an admin");
    }

    await this.db.pool.query(
      "UPDATE auth_users SET role='admin' WHERE email=$1",
      [targetEmail],
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
      [targetEmail],
    );
    if (target.rows.length === 0) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    await this.db.pool.query(
      "UPDATE auth_users SET role='user' WHERE email=$1",
      [targetEmail],
    );
    console.log(`✅ ${targetEmail} demoted to user by ${callerEmail}`);
    return { message: `${targetEmail} is now a regular user` };
  }

  async getAdmins(callerEmail: string) {
    await this.requireAdmin(callerEmail);
    const result = await this.db.pool.query(
      "SELECT email, created_at FROM auth_users WHERE role='admin' ORDER BY created_at ASC",
    );
    return result.rows;
  }

  async getAllUsers(callerEmail: string) {
    await this.requireAdmin(callerEmail);
    const result = await this.db.pool.query(
      "SELECT id, email, role, created_at FROM auth_users ORDER BY created_at DESC",
    );
    return result.rows;
  }

  async getAuditLogs(callerEmail: string) {
    await this.requireAdmin(callerEmail);
    return getPersistedLogs(7);
  }

  async getUserProfile(email: string) {
    const result = await this.db.pool.query(
      "SELECT id, email, role, created_at FROM auth_users WHERE email=$1",
      [email],
    );
    if (result.rows.length === 0) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }
    return result.rows[0];
  }

}
