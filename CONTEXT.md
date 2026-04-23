# Corpo VPN - Project Context

## Overview
Corpo VPN is a full-stack VPN application featuring a Progressive Web App (PWA) Electron-based desktop client and a NestJS/PostgreSQL backend. It integrates with WireGuard for secure tunneling and includes a comprehensive organization-based policy management system.

## Recent Major Updates (April 2026)

### 1. Security & Environment Configuration
- **Hardcoded Secrets Removed:** All hardcoded sensitive data (DB passwords, Gmail App Passwords, JWT secrets, personal emails, WireGuard keys, and server IPs) were successfully removed from the source code.
- **Environment Variables:** The application now securely loads secrets via `.env` files using `dotenv`.
- **Git Ignore:** `.env` files are tracked in `.gitignore` to prevent secret leakage. `.env.example` files are provided in both `front` and `back` directories as templates for new setups.

### 2. Database Migration (VPS Hosting)
- **Remote Database:** The PostgreSQL database was successfully migrated from `localhost` to the Contabo VPS at `80.65.211.27`.
- **Custom Port:** PostgreSQL is configured to listen on port `3005` for enhanced security.
- **Access Control:** `pg_hba.conf` and `postgresql.conf` are configured to accept remote connections safely using SCRAM-SHA-256 authentication.

### 3. Admin Promotion & Registration Flow
- **Seamless Admin Invites:** When an existing admin promotes a non-existent email to the admin role, the system creates a placeholder account with a `PENDING_REGISTRATION` status.
- **Streamlined Onboarding:** The invited admin can use the standard Registration page. The system automatically detects their pending admin status, bypasses standard VPN policy email restrictions, and links their newly set password securely to their admin role without requiring a "Forgot Password" workaround.

## Project Structure
- **`grad project draft front/`**: React + Electron desktop client. Handles the UI, mock data for testing, and IPC communication for native OS features (like window controls and WireGuard tunnel management).
- **`grad project draft back/`**: NestJS backend. Manages user authentication, OTP generation, VPN policies, and database interactions with PostgreSQL.

## Deployment Notes
- **VPS IP:** `80.65.211.27`
- **WireGuard Port:** `51820`
- **PostgreSQL Port:** `3005`
- Remember to use the `admin` account seeded during initialization to access dashboard capabilities.
