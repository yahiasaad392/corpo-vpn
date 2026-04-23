// ============================================================
// CORPORATE GATEWAY DATA — Real Server
// ============================================================
export const hqGateway = {
  name: "Corpo VPN Gateway",
  location: "Contabo VPS — Germany",
  gatewayIp: "203.0.113.50",
  protocol: "WireGuard",
  encryption: "ChaCha20-Poly1305",
  uptime: "99.99%",
  load: 12,
  ping: 18,
};

// ============================================================
// CORPORATE RESOURCES (Internal Network Access)
// ============================================================
export const corporateResources = [
  { id: 1, name: "Internal HR Portal", type: "Web", status: "Available", category: "HR" },
  { id: 2, name: "File Server (Project Z)", type: "SMB", status: "Available", category: "Storage" },
  { id: 3, name: "Staging DB01", type: "SQL", status: "Available", category: "Database" },
  { id: 4, name: "Corporate Intranet", type: "Web", status: "Available", category: "Internal" },
  { id: 5, name: "Jenkins CI Build Server", type: "Tool", status: "Restricted", category: "DevOps" },
  { id: 6, name: "Employee Directory", type: "Web", status: "Available", category: "HR" },
  { id: 7, name: "Security Audit Tool", type: "Admin", status: "Admin Only", category: "Security" },
];

// ============================================================
// CONNECTION STATS
// ============================================================
export const connectionStats = {
  internalIp: "10.10.0.3",
  externalIp: "203.0.113.50",
  sessionDuration: "00:00:00",
  dataTransferred: "0 B",
  downloadSpeed: "-- Mbps",
  uploadSpeed: "-- Mbps",
};

// ============================================================
// CORPORATE LOG ENTRIES
// ============================================================
export const initialLogs = [
  { id: 1,  time: '09:00:01', level: 'info',    message: 'System initialization complete.' },
  { id: 2,  time: '09:00:05', level: 'info',    message: 'Local identity check passed.' },
  { id: 3,  time: '09:00:10', level: 'info',    message: 'Attempting WireGuard handshake to 203.0.113.50:51820...' },
  { id: 4,  time: '09:00:12', level: 'info',    message: 'Peer public key exchange in progress...' },
  { id: 5,  time: '09:00:15', level: 'info',    message: 'WireGuard handshake completed successfully.' },
  { id: 6,  time: '09:00:16', level: 'info',    message: 'Tunnel established. Virtual IP: 10.10.0.3.' },
  { id: 7,  time: '09:00:18', level: 'info',    message: 'DNS set to 1.1.1.1 via tunnel.' },
  { id: 8,  time: '09:00:20', level: 'info',    message: 'All traffic routed through VPN. Connection protected.' },
];

export const liveLogs = [
  { level: 'info',    message: 'WireGuard keepalive sent to 203.0.113.50.' },
  { level: 'info',    message: 'Session heart-beat: OK.' },
  { level: 'warning', message: 'Latency spike detected on endpoint.' },
  { level: 'info',    message: 'WireGuard re-keying initiated.' },
  { level: 'info',    message: 'Tunnel integrity verified.' },
  { level: 'success', message: 'Compliance check passed: Device is compliant.' },
];

// ============================================================
// APP FEATURES (Landing Page)
// ============================================================
export const appFeatures = [
  { title: "WireGuard Tunnel", description: "Ultra-fast encrypted tunnel using the next-gen WireGuard protocol." },
  { title: "Device Compliance", description: "Ensures your workstation meets corporate security standards." },
  { title: "Seamless MFA", description: "Integrated authentication with company identity providers." },
  { title: "Admin Controlled", description: "Policies and access levels managed by corporate IT." },
];
