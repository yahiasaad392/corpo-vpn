// ============================================================
// CORPORATE GATEWAY DATA
// ============================================================
export const hqGateway = {
  name: "Main HQ Gateway",
  location: "New York, USA (HQ)",
  gatewayIp: "10.45.120.1",
  protocol: "IKEv2 / IPsec",
  encryption: "AES-256-GCM",
  uptime: "99.99%",
  load: 12, // %
  ping: 18, // ms
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
// CONNECTION STATS (Mocked)
// ============================================================
export const connectionStats = {
  internalIp: "10.200.5.84",
  externalIp: "154.22.8.102",
  sessionDuration: "00:42:15",
  dataTransferred: "1.2 GB",
  downloadSpeed: "154 Mbps",
  uploadSpeed: "42 Mbps",
};

// ============================================================
// CORPORATE LOG ENTRIES
// ============================================================
export const initialLogs = [
  { id: 1,  time: '09:00:01', level: 'info',    message: 'System initialization complete.' },
  { id: 2,  time: '09:00:05', level: 'info',    message: 'Local identity check passed.' },
  { id: 3,  time: '09:00:10', level: 'info',    message: 'Attempting connection to HQ Gateway (10.45.120.1)...' },
  { id: 4,  time: '09:00:12', level: 'warning', message: 'MFA prompt sent to registered device.' },
  { id: 5,  time: '09:00:25', level: 'info',    message: 'MFA verification successful.' },
  { id: 6,  time: '09:00:28', level: 'info',    message: 'Negotiating IPsec tunnel parameters...' },
  { id: 7,  time: '09:00:30', level: 'info',    message: 'IKEv2 SA established with HQ.' },
  { id: 8,  time: '09:00:32', level: 'info',    message: 'Protected tunnel established. Virtual IP: 10.200.5.84.' },
];

export const liveLogs = [
  { level: 'info',    message: 'Policy check: Internal Intranet access granted.' },
  { level: 'info',    message: 'Session heart-beat: OK.' },
  { level: 'warning', message: 'Latency spike detected on HQ-TAP-01.' },
  { level: 'info',    message: 'Automatic re-keying initiated for IPsec tunnel.' },
  { level: 'info',    message: 'SAML token refreshed for user.' },
  { level: 'error',   message: 'Unauthorized access attempt detected for "Database Shell".' },
  { level: 'success', message: 'Integrity check passed: Device is compliant.' },
];

// ============================================================
// APP FEATURES (Corporate Focus)
// ============================================================
export const appFeatures = [
  { title: "HQ Tunnel", description: "Direct encrypted access to Company HQ resources via IPsec." },
  { title: "Device Compliance", description: "Ensures your workstation meets corporate security standards." },
  { title: "Seamless MFA", description: "Integrated authentication with company identity providers." },
  { title: "Admin Controlled", description: "Policies and access levels managed by corporate IT." },
];
