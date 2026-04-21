// ============================================================
// COMPLIANCE CHECKS — All 30 checks with IDs, labels, categories
// ============================================================

export const COMPLIANCE_CHECKS = {
  critical: [
    { id: 'antivirus_running', label: 'Antivirus installed and running' },
    { id: 'realtime_protection', label: 'Real-time protection enabled' },
    { id: 'firewall_enabled', label: 'Firewall enabled' },
    { id: 'supported_windows', label: 'Supported Windows version' },
    { id: 'secure_boot', label: 'Secure Boot enabled' },
    { id: 'tpm_enabled', label: 'TPM enabled' },
    { id: 'no_public_wifi', label: 'Device is not connected to a public Wi-Fi network' },
    { id: 'domain_joined', label: 'Device is domain joined / registered' },
    { id: 'no_other_vpn', label: 'No other VPN or proxy is active' },
  ],
  warning: [
    { id: 'bitlocker_enabled', label: 'BitLocker enabled' },
    { id: 'windows_updates', label: 'Windows updates outdated' },
    { id: 'av_definitions', label: 'Antivirus definitions outdated' },
    { id: 'low_disk_space', label: 'Low disk space' },
    { id: 'usb_connected', label: 'USB storage device connected' },
    { id: 'local_admin', label: 'User has local administrator rights' },
    { id: 'suspicious_process', label: 'Suspicious process running' },
    { id: 'browser_outdated', label: 'Browser outdated' },
    { id: 'vpn_client_outdated', label: 'VPN client outdated' },
    { id: 'hostname_mismatch', label: 'Hostname mismatch' },
    { id: 'last_malware_scan', label: 'Last malware scan is old' },
  ],
  info: [
    { id: 'battery_level', label: 'Battery level' },
    { id: 'device_manufacturer', label: 'Device manufacturer' },
    { id: 'cpu_ram_info', label: 'CPU and RAM information' },
    { id: 'disk_health', label: 'Disk health' },
    { id: 'last_reboot', label: 'Last reboot time' },
    { id: 'machine_guid', label: 'Machine GUID' },
    { id: 'installed_software', label: 'Installed software list' },
    { id: 'logged_in_user', label: 'Logged-in username' },
    { id: 'os_build', label: 'OS build number' },
    { id: 'connected_peripherals', label: 'Connected peripherals' },
  ],
};

// Flat lookup: checkId → { id, label, defaultCategory }
export const ALL_CHECKS_MAP = {};
Object.entries(COMPLIANCE_CHECKS).forEach(([category, checks]) => {
  checks.forEach(c => {
    ALL_CHECKS_MAP[c.id] = { ...c, defaultCategory: category };
  });
});

// All check IDs flat
export const ALL_CHECK_IDS = Object.keys(ALL_CHECKS_MAP);
