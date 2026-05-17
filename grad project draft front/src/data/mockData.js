// ============================================================
// CORPORATE GATEWAY DATA — Real Server
// ============================================================
export const hqGateway = {
  name: "Corpo VPN Gateway",
  location: "Contabo VPS — Germany",
  gatewayIp: "203.0.113.50",
  protocol: "Corpo Tunnel",
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
  { id: 3,  time: '09:00:10', level: 'info',    message: 'Attempting Corpo Tunnel handshake to 203.0.113.50:51820...' },
  { id: 4,  time: '09:00:12', level: 'info',    message: 'Endpoint compliance verified. Policy enforced.' },
  { id: 5,  time: '09:00:15', level: 'info',    message: 'Corpo Tunnel handshake completed successfully.' },
  { id: 6,  time: '09:00:16', level: 'info',    message: 'Tunnel established. Virtual IP: 10.10.0.3.' },
  { id: 7,  time: '09:00:18', level: 'info',    message: 'DNS set to 1.1.1.1 via tunnel.' },
  { id: 8,  time: '09:00:20', level: 'info',    message: 'All traffic routed through VPN. Connection protected.' },
];

export const liveLogs = [
  { level: 'info',    message: 'Corpo Tunnel keepalive sent to 203.0.113.50.' },
  { level: 'info',    message: 'Bytes received: 1.2 GB / Sent: 450 MB.' },
  { level: 'warning', message: 'Latency spike detected to gateway (145ms).' },
  { level: 'info',    message: 'Corpo Tunnel re-keying initiated.' },
  { level: 'error',   message: 'Connection dropped unexpectedly. Attempting reconnect.' },
  { level: 'success', message: 'Compliance check passed: Device is compliant.' },
];

// ============================================================
// APP FEATURES (Landing Page)
// ============================================================
export const appFeatures = [
  { icon: '⚡', title: "WireGuard-Powered Performance", description: "Built on modern WireGuard architecture for ultra-low latency, fast connection speeds, and enterprise scalability." },
  { icon: '🛡️', title: "Zero-Trust Security Model", description: "Every session is continuously verified. No implicit trust. No unrestricted network exposure." },
  { icon: '🔍', title: "Real-Time Device Compliance", description: "Validates OS version, security patches, antivirus status, and device integrity before granting access." },
  { icon: '🔐', title: "Multi-Factor Authentication", description: "Supports secure OTP authentication flows to reduce account compromise risk and strengthen identity protection." },
  { icon: '🌐', title: "Granular Access Control", description: "Users only access what they need. Micro-segmented permissions reduce attack surfaces and lateral movement." },
  { icon: '📊', title: "Centralized Admin Dashboard", description: "Manage users, monitor active sessions, revoke compromised devices, and enforce policies from one dashboard." },
];
