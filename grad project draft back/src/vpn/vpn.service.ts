import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class VpnService {
  private vpsApi: string;

  constructor(private db: DatabaseService) {
    this.vpsApi = process.env.VPN_SERVER_API || 'http://80.65.211.27:3000';
  }

  // ── Helper: require caller to be admin ──
  private async requireAdmin(callerEmail: string) {
    const result = await this.db.pool.query(
      "SELECT role FROM auth_users WHERE email=$1",
      [callerEmail],
    );
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      throw new ForbiddenException('Access denied: Admins only');
    }
  }

  // ═════════════════════════════════════════════════════════════
  // VPS COMMUNICATION — WireGuard Peer Provisioning
  // ═════════════════════════════════════════════════════════════

  /**
   * Calls the VPS to create a new WireGuard peer.
   * Returns { privateKey, clientIp, rawConfig } or null on failure.
   * Handles multiple common response formats from WireGuard API servers.
   */
  async provisionPeerFromVPS(): Promise<{
    privateKey: string;
    clientIp: string;
    rawConfig: string;
  } | null> {
    try {
      console.log(`[VPN] Calling VPS: POST ${this.vpsApi}/create-client`);

      const response = await fetch(`${this.vpsApi}/create-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (!response.ok) {
        console.error(`[VPN] VPS returned ${response.status}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      console.log('[VPN] VPS response keys:', Object.keys(data));

      // ── Parse the response — handle common formats ──

      let privateKey: string | null = null;
      let clientIp: string | null = null;
      let rawConfig: string = '';

      // Format 1: { config: "full INI string" }
      if (data.config && typeof data.config === 'string') {
        rawConfig = data.config;
        // Parse PrivateKey and Address from INI config
        const pkMatch = rawConfig.match(/PrivateKey\s*=\s*(.+)/);
        const addrMatch = rawConfig.match(/Address\s*=\s*([^\s/]+)/);
        if (pkMatch) privateKey = pkMatch[1].trim();
        if (addrMatch) clientIp = addrMatch[1].trim();
      }

      // Format 2: { privateKey, address/clientIp, ... }
      if (!privateKey && data.privateKey) privateKey = data.privateKey;
      if (!clientIp && data.address) clientIp = data.address.replace(/\/\d+$/, ''); // strip CIDR
      if (!clientIp && data.clientIp) clientIp = data.clientIp;
      if (!clientIp && data.client_ip) clientIp = data.client_ip;

      // Format 3: { client: { privateKey, address } }
      if (!privateKey && data.client?.privateKey) privateKey = data.client.privateKey;
      if (!clientIp && data.client?.address) clientIp = data.client.address.replace(/\/\d+$/, '');

      if (!privateKey || !clientIp) {
        console.error('[VPN] Could not parse privateKey/clientIp from VPS response:', JSON.stringify(data).substring(0, 300));
        return null;
      }

      // Build raw config if not already provided
      if (!rawConfig) {
        rawConfig = [
          '[Interface]',
          `PrivateKey = ${privateKey}`,
          `Address = ${clientIp}/24`,
          `DNS = 1.1.1.1`,
          '',
          '[Peer]',
          `PublicKey = ${data.serverPublicKey || data.publicKey || 'SERVER_KEY'}`,
          `Endpoint = ${data.endpoint || '80.65.211.27:51820'}`,
          `AllowedIPs = 0.0.0.0/0`,
          `PersistentKeepalive = 25`,
        ].join('\n');
      }

      console.log(`[VPN] ✅ Peer provisioned: IP=${clientIp}`);
      return { privateKey, clientIp, rawConfig };
    } catch (err) {
      console.error('[VPN] ❌ VPS provisioning failed:', err.message);
      return null;
    }
  }

  /**
   * Store WireGuard config in the user's auth_users row.
   */
  async storeUserConfig(email: string, config: { privateKey: string; clientIp: string; rawConfig: string }) {
    await this.db.pool.query(
      `UPDATE auth_users SET wg_config=$1, wg_private_key=$2, wg_address=$3 WHERE email=$4`,
      [config.rawConfig, config.privateKey, config.clientIp, email],
    );
    console.log(`[VPN] ✅ Config stored for ${email}`);
  }

  // ═════════════════════════════════════════════════════════════
  // CONNECT — Session-based VPN connect
  // ═════════════════════════════════════════════════════════════

  /**
   * POST /api/vpn/connect
   * 1. Checks user exists
   * 2. Validates compliance (if not admin)
   * 3. Ensures user has a WireGuard peer (provisions from VPS if missing)
   * 4. Creates a vpn_sessions record
   * 5. Returns { sessionId, privateKey, clientIp }
   */
  async connect(email: string, complianceResults: any) {
    // ── Step 1: Verify user exists ──
    const userResult = await this.db.pool.query(
      'SELECT id, email, role, wg_private_key, wg_address, wg_config FROM auth_users WHERE email=$1',
      [email],
    );
    if (userResult.rows.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const user = userResult.rows[0];
    const isAdmin = user.role === 'admin';

    // ── Step 2: Server-side compliance validation (non-admin only) ──
    if (!isAdmin && complianceResults) {
      // Fetch user's policy
      const policyResult = await this.db.pool.query(
        'SELECT * FROM vpn_policies WHERE $1 = ANY(emails) LIMIT 1',
        [email],
      );

      if (policyResult.rows.length > 0) {
        const policy = policyResult.rows[0];
        const criticalChecks: string[] = policy.critical_checks || [];

        // Check if any critical checks failed
        const criticalFails = criticalChecks.filter(
          (checkId) => complianceResults[checkId] && !complianceResults[checkId].pass,
        );

        if (criticalFails.length > 0) {
          throw new ForbiddenException(
            `VPN connection blocked: ${criticalFails.length} critical compliance check(s) failed. Checks: ${criticalFails.join(', ')}`,
          );
        }
      }
    }

    // ── Step 3: Ensure user has WireGuard config (provision if missing) ──
    let privateKey = user.wg_private_key;
    let clientIp = user.wg_address;

    if (!privateKey || !clientIp) {
      console.log(`[VPN] User ${email} has no WG config — provisioning from VPS...`);
      const peerConfig = await this.provisionPeerFromVPS();

      if (!peerConfig) {
        throw new HttpException(
          'Failed to provision VPN peer from server. The VPN server may be unreachable. Please try again later or contact your admin.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      await this.storeUserConfig(email, peerConfig);
      privateKey = peerConfig.privateKey;
      clientIp = peerConfig.clientIp;
    }

    // ── Step 4: Close any existing active session for this user ──
    await this.db.pool.query(
      `UPDATE vpn_sessions SET session_status='disconnected', disconnected_at=NOW()
       WHERE user_email=$1 AND session_status='active'`,
      [email],
    );

    // ── Step 5: Create new session record ──
    // Determine compliance status
    let complianceStatus = 'passed';
    if (isAdmin) {
      complianceStatus = 'bypassed';
    } else if (complianceResults) {
      // Check for any warning failures
      const policyResult = await this.db.pool.query(
        'SELECT warning_checks FROM vpn_policies WHERE $1 = ANY(emails) LIMIT 1',
        [email],
      );
      if (policyResult.rows.length > 0) {
        const warningChecks: string[] = policyResult.rows[0].warning_checks || [];
        const warningFails = warningChecks.filter(
          (id) => complianceResults[id] && !complianceResults[id].pass,
        );
        if (warningFails.length > 0) complianceStatus = 'warning';
      }
    }

    const warningCheckIds = complianceStatus === 'warning'
      ? Object.keys(complianceResults || {}).filter(
          (id) => complianceResults[id] && !complianceResults[id].pass,
        )
      : [];

    const sessionResult = await this.db.pool.query(
      `INSERT INTO vpn_sessions (user_email, client_ip, compliance_status, warning_checks, session_status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, connected_at`,
      [email, clientIp, complianceStatus, warningCheckIds],
    );

    const session = sessionResult.rows[0];

    console.log(`[VPN] ✅ Session #${session.id} started for ${email} (IP: ${clientIp}, compliance: ${complianceStatus})`);

    return {
      sessionId: session.id,
      privateKey,
      clientIp,
      connectedAt: session.connected_at,
      complianceStatus,
    };
  }

  // ═════════════════════════════════════════════════════════════
  // DISCONNECT — End a VPN session
  // ═════════════════════════════════════════════════════════════

  /**
   * POST /api/vpn/disconnect
   * Marks the session as disconnected. Does NOT revoke the WireGuard peer
   * (same peer is reused on next connect for efficiency).
   */
  async disconnect(email: string, sessionId?: number) {
    let result;

    if (sessionId) {
      // Disconnect a specific session
      result = await this.db.pool.query(
        `UPDATE vpn_sessions SET session_status='disconnected', disconnected_at=NOW()
         WHERE id=$1 AND user_email=$2 AND session_status='active'
         RETURNING id`,
        [sessionId, email],
      );
    } else {
      // Disconnect all active sessions for this user
      result = await this.db.pool.query(
        `UPDATE vpn_sessions SET session_status='disconnected', disconnected_at=NOW()
         WHERE user_email=$1 AND session_status='active'
         RETURNING id`,
        [email],
      );
    }

    const count = result.rows.length;
    console.log(`[VPN] ✅ ${count} session(s) disconnected for ${email}`);

    return {
      message: `${count} session(s) disconnected`,
      disconnectedSessions: result.rows.map((r) => r.id),
    };
  }

  // ═════════════════════════════════════════════════════════════
  // GET CONFIG — Return user's stored WireGuard config
  // ═════════════════════════════════════════════════════════════

  async getConfig(email: string) {
    const result = await this.db.pool.query(
      'SELECT wg_config, wg_private_key, wg_address FROM auth_users WHERE email=$1',
      [email],
    );

    if (result.rows.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const user = result.rows[0];

    if (!user.wg_private_key || !user.wg_address) {
      return { provisioned: false };
    }

    return {
      provisioned: true,
      privateKey: user.wg_private_key,
      clientIp: user.wg_address,
      rawConfig: user.wg_config,
    };
  }

  // ═════════════════════════════════════════════════════════════
  // REPROVISION — Get a fresh WireGuard peer from VPS
  // ═════════════════════════════════════════════════════════════

  async reprovision(email: string) {
    // Verify user exists
    const userResult = await this.db.pool.query(
      'SELECT id FROM auth_users WHERE email=$1',
      [email],
    );
    if (userResult.rows.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Call VPS for a new peer
    const peerConfig = await this.provisionPeerFromVPS();
    if (!peerConfig) {
      throw new HttpException(
        'Failed to re-provision VPN peer. VPN server may be unreachable.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Store new config (overwrites old)
    await this.storeUserConfig(email, peerConfig);

    console.log(`[VPN] ✅ Re-provisioned peer for ${email}`);
    return {
      message: 'VPN peer re-provisioned successfully',
      clientIp: peerConfig.clientIp,
    };
  }

  // ═════════════════════════════════════════════════════════════
  // ACTIVE SESSIONS — Admin: list who is currently connected
  // ═════════════════════════════════════════════════════════════

  async getActiveSessions(callerEmail: string) {
    await this.requireAdmin(callerEmail);

    const result = await this.db.pool.query(
      `SELECT id, user_email, client_ip, connected_at, compliance_status
       FROM vpn_sessions
       WHERE session_status='active'
       ORDER BY connected_at DESC`,
    );

    return result.rows;
  }

  // ═════════════════════════════════════════════════════════════
  // SESSION HISTORY — Admin: list past sessions
  // ═════════════════════════════════════════════════════════════

  async getSessionHistory(callerEmail: string, limit = 50) {
    await this.requireAdmin(callerEmail);

    const result = await this.db.pool.query(
      `SELECT id, user_email, client_ip, connected_at, disconnected_at, compliance_status, session_status, warning_checks
       FROM vpn_sessions
       ORDER BY connected_at DESC
       LIMIT $1`,
      [limit],
    );

    return result.rows;
  }
}
