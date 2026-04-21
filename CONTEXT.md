# Corpo VPN — Full Project Context for AI Assistants

> **Read this file first before doing anything.** It contains everything about this project.

---

## What This Project Is
A full-stack **corporate VPN desktop application** (graduation project).
- **GitHub (private)**: https://github.com/yahiasaad392/corpo-vpn
- **Previous AI conversation ID**: `b615aa91-3aae-4660-82c0-8d3524af9980`

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Desktop App | Electron v30 |
| UI Framework | React 18 + Vite |
| Styling | Tailwind CSS v3 + custom CSS (glassmorphism, dark theme) |
| Icons | Lucide React |
| Backend | NestJS (Node.js) |
| Database | PostgreSQL |
| VPN Protocol | WireGuard |
| Auth | JWT + bcrypt + nodemailer (OTP) |

---

## File Paths on This Machine

### Frontend (React + Electron)
```
d:\Users\pc\Desktop\full stack grad project draft\grad project draft front\
├── electron\
│   ├── main.js          ← Electron main process: WireGuard tunnel + 30-check compliance IPC
│   └── preload.js       ← Exposes window.electronAPI to React (window controls + compliance + VPN)
├── src\
│   ├── App.jsx          ← React Router (routes: /auth, /app/*) + AdminRoute guard
│   ├── pages\
│   │   ├── Auth.jsx            ← Login / Register / Forgot Password / OTP reset (live password checklist)
│   │   ├── Dashboard.jsx       ← Main VPN connect page + policy-aware compliance (admin bypass)
│   │   ├── Settings.jsx        ← WireGuard config + Change Password + Admin Management (admin-only)
│   │   ├── AdminPanel.jsx      ← Admin-only: user list, promote/demote, search, stats
│   │   ├── Policies.jsx        ← Admin-only: VPN Policy Management (CRUD + compliance check configuration)
│   │   ├── ComplianceCheck.jsx ← Standalone compliance page (legacy, unused)
│   │   ├── Network.jsx         ← Admin-only page
│   │   └── Logs.jsx            ← Admin-only page
│   ├── components\
│   │   ├── AppShell.jsx          ← App layout: role-based nav sidebar + header + role badge
│   │   ├── ComplianceSidebar.jsx ← Slide-in sidebar showing 3-section compliance results (Critical/Warning/Info)
│   │   ├── StatusRing.jsx
│   │   ├── StatsCard.jsx
│   │   └── LogEntry.jsx
│   └── data\
│       ├── mockData.js           ← Gateway + resource mock data
│       └── complianceChecks.js   ← All 30 compliance check definitions (IDs, labels, categories)
```

### Backend (NestJS)
```
d:\Users\pc\Desktop\full stack grad project draft\grad project draft back\
├── src\
│   ├── main.ts               ← Listens 0.0.0.0:3001, CORS enabled
│   ├── auth\
│   │   ├── auth.controller.ts ← All /api/auth/* endpoints (incl. admin management)
│   │   ├── auth.service.ts    ← JWT (with role), bcrypt, OTP, email, admin CRUD, registration policy-gating
│   │   ├── auth.module.ts
│   │   └── jwt.guard.ts
│   ├── policy\
│   │   ├── policy.controller.ts ← All /api/policy/* endpoints (CRUD, user lookup, warning emails)
│   │   ├── policy.service.ts    ← Policy CRUD, email-in-policy check, admin warning notifications
│   │   └── policy.module.ts
│   └── database\
│       ├── database.service.ts ← PostgreSQL Pool (env only, no hardcoded creds)
│       └── database.module.ts
├── .env                      ← DB creds + JWT_SECRET + email creds
├── .env.example              ← Template
├── init-db.js                ← Run once to create DB tables (auth_users, auth_otp_codes, vpn_policies)
├── setup-db.js
└── nuke-db.js                ← Drops all tables (danger!)
```

---

## How to Run

### Terminal 1 — Backend
```cmd
cd "d:\Users\pc\Desktop\full stack grad project draft\grad project draft back"
npm run start:dev
```
Runs on: **http://127.0.0.1:3001**

### Terminal 2 — Frontend (Electron)
```cmd
cd "d:\Users\pc\Desktop\full stack grad project draft\grad project draft front"
npm run electron:dev
```

---

## Database

- **Type**: PostgreSQL
- **DB Name**: `gradprojdb`
- **User**: `postgres`
- **Port**: `5432`
- **Tables**: `auth_users`, `auth_otp_codes`, `vpn_policies`

### SQL to Run Before Starting (if tables don't exist)

```sql
CREATE TABLE IF NOT EXISTS auth_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  failed_attempts INT DEFAULT 0,
  lock_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  otp VARCHAR(10),
  otp_expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_otp_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  last_sent TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vpn_policies (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  max_users INT NOT NULL DEFAULT 10,
  session_timeout INT NOT NULL DEFAULT 3600,
  emails TEXT[] NOT NULL DEFAULT '{}',
  critical_checks TEXT[] NOT NULL DEFAULT '{}',
  warning_checks TEXT[] NOT NULL DEFAULT '{}',
  info_checks TEXT[] NOT NULL DEFAULT '{}',
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### auth_users Table
```sql
CREATE TABLE auth_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',       -- 'user' or 'admin'
  failed_attempts INT DEFAULT 0,
  lock_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  otp VARCHAR(10),
  otp_expires_at TIMESTAMP
);
```

### auth_otp_codes Table
```sql
CREATE TABLE auth_otp_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  last_sent TIMESTAMP DEFAULT NOW()
);
```

### vpn_policies Table
```sql
CREATE TABLE vpn_policies (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  max_users INT NOT NULL DEFAULT 10,
  session_timeout INT NOT NULL DEFAULT 3600,
  emails TEXT[] NOT NULL DEFAULT '{}',           -- array of user emails allowed to register/connect
  critical_checks TEXT[] NOT NULL DEFAULT '{}',  -- check IDs: fail = block VPN
  warning_checks TEXT[] NOT NULL DEFAULT '{}',   -- check IDs: fail = warn + email admins
  info_checks TEXT[] NOT NULL DEFAULT '{}',      -- check IDs: fail = display only
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Key DB Facts
- `role` column: `'user'` (default) or `'admin'`
- Root admin: `ys5313944@gmail.com` — cannot be demoted
- New registrations always get `role = 'user'`
- Account locks after 5 failed login attempts for 15 minutes
- **Registration is gated**: user email must exist in at least one `vpn_policies.emails` array to register
- Exempt emails bypass registration gating: `ys5313944@gmail.com`, `yahiasaad1904@gmail.com`

---

## Role-Based Access Control (RBAC)

### Roles
| Role | Description |
|------|-------------|
| `user` | Regular user. Can only access Connection + Settings |
| `admin` | Full access. Can see HQ Network, Audit Logs, Admin Panel, Policies, and manage other admins |

### Root Admin
- **Email**: `ys5313944@gmail.com`
- Cannot be demoted by anyone (enforced in backend)
- Can promote any registered user to admin
- Can demote any other admin back to user

### How Roles Work
1. **JWT contains role**: `{ user: email, role: 'admin' | 'user' }`
2. **Frontend stores in localStorage**: `vpn_user` = `{ email, role }`
3. **`AdminRoute` guard** in `App.jsx` blocks non-admins from admin pages
4. **`AppShell.jsx`** reads role → shows/hides nav items conditionally
5. **Backend `requireAdmin()`** helper validates caller is admin before admin operations

### Navigation by Role
| Page | Route | User | Admin |
|------|-------|------|-------|
| Connection (Dashboard) | `/app/dashboard` | ✅ | ✅ |
| Settings | `/app/settings` | ✅ (limited) | ✅ (+ Admin Management section) |
| HQ Network | `/app/network` | ❌ (redirected) | ✅ |
| Audit Logs | `/app/logs` | ❌ (redirected) | ✅ |
| Admin Panel | `/app/admin` | ❌ (redirected) | ✅ |
| Policies | `/app/policies` | ❌ (redirected) | ✅ |

### Admin-Only UI Elements
- **AppShell sidebar**: Admin sees "Admin Area" separator with gold crown + HQ Network, Audit Logs, Admin Panel, Policies links
- **AppShell header**: Shows gold "Admin Session" badge for admins
- **AppShell bottom**: Shows user email + role badge (gold crown for admin, blue shield for user)
- **Dashboard**: HQ Details gateway card only visible to admins
- **Dashboard**: Admins bypass all compliance checks when connecting
- **Settings**: "Admin Management" section at bottom — promote/demote admins, list current admins
- **AdminPanel page**: Full user table with search, promote/demote buttons, user/admin counts
- **Policies page**: CRUD for company VPN policies with compliance check configuration

---

## Backend API Endpoints
**Base**: `http://127.0.0.1:3001/api/auth`

### Authentication
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/register` | Register (regex validated, role defaults to 'user', **email must be in a policy**) |
| POST | `/login` | Login → sends OTP email |
| POST | `/verify-otp` | Verifies OTP → returns `{ token, role }` |
| POST | `/resend-otp` | Resends OTP (30s cooldown) |
| POST | `/forgot-password` | Sends password reset OTP to email |
| POST | `/reset-password` | Resets password using OTP |
| POST | `/change-password` | Changes password (needs old pass) |

### Profile
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/me?email=...` | Returns user profile `{ id, email, role, created_at }` |

### Admin Management (admin-only)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/add-admin` | Body: `{ callerEmail, targetEmail }` — promotes user to admin |
| POST | `/remove-admin` | Body: `{ callerEmail, targetEmail }` — demotes admin to user |
| GET | `/admins?callerEmail=...` | Returns list of all admins |
| GET | `/users?callerEmail=...` | Returns list of all registered users |

**Base**: `http://127.0.0.1:3001/api/policy`

### Policy Management (admin-only except my-policy and check-email)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/check-email?email=...` | Check if email is in any policy `{ allowed: bool }` |
| POST | `/create` | Body: `{ callerEmail, companyName, maxUsers, sessionTimeout, emails, criticalChecks, warningChecks, infoChecks }` |
| PUT | `/update/:id` | Same body + policy ID in URL |
| DELETE | `/delete/:id` | Body: `{ callerEmail }` |
| GET | `/list?callerEmail=...` | List all policies |
| GET | `/my-policy?email=...` | Get policy for a user (matched by emails array) |
| POST | `/notify-warning` | Body: `{ userEmail, failedChecks }` — sends warning email to all admins |

**Auth header format**: `Authorization: Bearer <token>`

---

## Authentication Features
- JWT stored in `localStorage` as `vpn_token`
- User info stored as `vpn_user` = `{ email, role }`
- **JWT payload**: `{ user: email, role: 'admin' | 'user' }`
- **Password regex**: min 8 chars, 1 uppercase, 1 lowercase, 1 special char, 1 number
- **Email regex**: standard email format
- **OTP login flow**: login → OTP sent to email → verify OTP → JWT issued
- **Forgot Password**: separate OTP flow via email
- **Change Password**: in Settings page, requires old password
- **Account lockout**: 5 failed attempts → 15 min lock
- **Registration gating**: Email must be in a `vpn_policies.emails` array to register
- **Exempt accounts** (bypass regex + registration gating on login):
  - `ys5313944@gmail.com`
  - `yahiasaad1904@gmail.com`
- **Register form**: Shows live password validation with dots indicator + per-rule checklist
  - At least 8 characters
  - Uppercase letter (A-Z)
  - Lowercase letter (a-z)
  - Special character (!@#$%^&*)
  - Number (0-9)

---

## Compliance Checks System

### Overview
30 compliance checks organized into 3 severity levels. Admins configure which checks to apply per company policy.

### Severity Levels
| Level | Behavior on Failure |
|-------|-------------------|
| **Critical** | VPN connection **BLOCKED** |
| **Warning** | VPN connection **ALLOWED** — user sees warning, admins receive email notification |
| **Informational** | **Display only** — shown to user, no admin notification |

### Admin Bypass
Admins skip all compliance checks when connecting. They connect directly to the VPN.

### All 30 Compliance Checks

#### Critical Checks (Deny Connection)
| # | ID | Label |
|---|-----|-------|
| 1 | `antivirus_running` | Antivirus installed and running |
| 2 | `realtime_protection` | Real-time protection enabled |
| 3 | `firewall_enabled` | Firewall enabled |
| 4 | `supported_windows` | Supported Windows version |
| 5 | `secure_boot` | Secure Boot enabled |
| 6 | `tpm_enabled` | TPM enabled |
| 7 | `no_public_wifi` | Device is not connected to a public Wi-Fi network |
| 8 | `domain_joined` | Device is domain joined / registered |
| 9 | `no_other_vpn` | No other VPN or proxy is active |

#### Warning Checks (Allow + Alert)
| # | ID | Label |
|---|-----|-------|
| 10 | `bitlocker_enabled` | BitLocker enabled |
| 11 | `windows_updates` | Windows updates outdated |
| 12 | `av_definitions` | Antivirus definitions outdated |
| 13 | `low_disk_space` | Low disk space |
| 14 | `usb_connected` | USB storage device connected |
| 15 | `local_admin` | User has local administrator rights |
| 16 | `suspicious_process` | Suspicious process running |
| 17 | `browser_outdated` | Browser outdated |
| 18 | `vpn_client_outdated` | VPN client outdated |
| 19 | `hostname_mismatch` | Hostname mismatch |
| 20 | `last_malware_scan` | Last malware scan is old |

#### Informational Checks (Display Only)
| # | ID | Label |
|---|-----|-------|
| 21 | `battery_level` | Battery level |
| 22 | `device_manufacturer` | Device manufacturer |
| 23 | `cpu_ram_info` | CPU and RAM information |
| 24 | `disk_health` | Disk health |
| 25 | `last_reboot` | Last reboot time |
| 26 | `machine_guid` | Machine GUID |
| 27 | `installed_software` | Installed software list |
| 28 | `logged_in_user` | Logged-in username |
| 29 | `os_build` | OS build number |
| 30 | `connected_peripherals` | Connected peripherals |

### VPN Connect Flow (User)
1. User clicks **Connect** on Dashboard
2. Frontend calls `GET /api/policy/my-policy?email=...` to fetch their company policy
3. Runs `window.electronAPI.runComplianceCheck()` → gets all 30 check results (keyed by ID)
4. Filters results against policy's selected checks:
   - **Critical failures** → Block connection, show red NON-COMPLIANT
   - **Warning failures** → Allow connection, show amber warnings, call `POST /api/policy/notify-warning`
   - **Info items** → Display in sidebar as informational (blue)
5. If no critical failures → proceed to VPN connect

### VPN Connect Flow (Admin)
1. Admin clicks **Connect** → skips compliance entirely → connects directly

### Electron IPC handlers (in `electron/main.js`)
- `compliance:run` → runs all 30 checks, returns results keyed by check ID
- `window:minimize` → minimizes the app window
- `window:maximize` → toggles maximize/restore
- `window:close` → closes the app window
- `window:is-maximized` → returns boolean maximize state
- `window:maximized-change` → event sent to renderer when maximize state changes (e.g. Windows snap)

### Frontend API (via `window.electronAPI`)
```js
// Window controls
window.electronAPI.windowMinimize()      // minimize the window
window.electronAPI.windowMaximize()      // toggle maximize/restore
window.electronAPI.windowClose()         // close the window
window.electronAPI.windowIsMaximized()   // Promise<boolean>
window.electronAPI.onMaximizedChange(cb) // subscribe to maximize state changes → returns cleanup fn

// Compliance
window.electronAPI.runComplianceCheck()  // { check_id: { pass, detail }, ..., overall }

// VPN
window.electronAPI.vpnConnect({ privateKey, clientIp })
window.electronAPI.vpnDisconnect()
window.electronAPI.vpnStatus()           // { connected, rx, tx, latestHandshake, endpoint }
window.electronAPI.vpnLoadConfig()       // saved WireGuard config
```

---

## VPN Policy Management (Admin Page)

### Page: `/app/policies`
Admin-only page with two-column layout:

**Left Card — "Add New Policy" Form:**
- Company Name, Max Users, Session Timeout inputs
- Dynamic company email fields (+ Add Email button)
- Three collapsible compliance check sections (Critical/Warning/Info)
- Each check is a toggleable checkbox
- Save / Update button

**Right Card — "Company Policies" Table:**
- Columns: Company, Max Users, Emails, Timeout, Compliance Summary, Actions
- Compliance badges: C:X W:Y I:Z (red/amber/blue)
- Edit (loads into form) and Delete buttons

**Tabs:** "Policies" (active) / "Compliance Monitor" (placeholder)

### Key Policy Rules
- Only emails listed in a policy can register in the system
- A user's policy determines which compliance checks are enforced at connect time
- Critical check failures block VPN access
- Warning check failures send email to all system admins
- Informational check results are display-only for the user

---

## WireGuard VPN Config
- **Gateway IP**: `80.65.211.27`
- **Port**: `51820`
- **DNS**: `1.1.1.1`
- **Allowed IPs**: `0.0.0.0/0`
- User enters **Private Key** + **Client IP** in Settings → saved via electron store

---

## UI Design System
- **Theme**: Dark (`#060818` bg), glassmorphism cards
- **Accent**: cyan (`text-cyan-400`, `border-cyan-500`)
- **Admin accent**: amber/gold (`text-amber-400`, `border-amber-500`)
- **Connected state**: emerald green
- **Non-compliant / error**: red
- **Scanning state**: amber
- **Warning compliance**: amber
- **Info compliance**: blue

### VPN Button States
| State | Color | Icon | Label |
|-------|-------|------|-------|
| disconnected | cyan | Shield | Connect |
| connecting (scanning) | amber | Zap (pulse) | Cancel |
| connected | emerald | ShieldCheck | Disconnect |
| error | red | ShieldX | Retry |

---

## Known Issues / TODOs
- [ ] `AppShell.jsx` header "Security Status" badge is **static** → needs to be wired to real compliance state
- [x] ~~`ComplianceCheck.jsx` standalone page is unused~~ → legacy, can be removed
- [x] ~~Compliance results should persist/show on re-opening dashboard~~ → policy-driven now
- [x] ~~Admin dashboard not yet built~~ → AdminPanel.jsx created
- [x] ~~Policy management~~ → Policies.jsx created with full CRUD
- [x] ~~30 compliance checks~~ → Implemented in Electron main.js
- [x] ~~Registration gating~~ → Only policy-listed emails can register
- [x] ~~Window controls are decorative~~ → wired to real Electron IPC (minimize/maximize-restore/close)
- [ ] Multiple server/peer selection not implemented

---

## .env File Structure (Backend)
```env
PORT=3001
JWT_SECRET=<your_secret>

DB_USER=postgres
DB_HOST=localhost
DB_NAME=gradprojdb
DB_PASSWORD=<your_password>
DB_PORT=5432

EMAIL_USER=<gmail_address>
EMAIL_PASS=<gmail_app_password>
```

---

## How to Continue Work in a New Chat

Tell the AI:
> "Read the file at `d:\Users\pc\Desktop\full stack grad project draft\CONTEXT.md` and use it to understand my project before making any changes."

Or just paste this file's content directly into the chat.
