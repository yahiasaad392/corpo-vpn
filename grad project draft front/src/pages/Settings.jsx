import { useState, useEffect } from "react";
import ToggleSwitch from "../components/ToggleSwitch";
import {
  ChevronDown,
  Save,
  CheckCircle,
  Key,
  Wifi,
  AlertTriangle,
  Crown,
  UserPlus,
  UserMinus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { AUTH_API as API, VPN_API } from "../lib/api";
import { supabase } from "../lib/supabase";



function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {description && (
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      )}
    </div>
  );
}

export default function Settings() {
  // Role check
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("vpn_user"));
    } catch {
      return null;
    }
  })();
  const isAdmin = currentUser?.role === "admin";

  // Admin management state
  const [adminEmail, setAdminEmail] = useState("");
  const [admins, setAdmins] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  const fetchAdmins = async () => {
    try {
      const res = await fetch(
        `${API}/admins?callerEmail=${encodeURIComponent(currentUser?.email)}`,
      );
      const data = await res.json();
      if (res.ok) setAdmins(data);
    } catch {}
  };

  useEffect(() => {
    if (isAdmin) fetchAdmins();
  }, [isAdmin]);

  const handleAddAdmin = async () => {
    setAdminError("");
    setAdminSuccess("");
    if (!adminEmail.trim()) return;
    setAdminLoading(true);
    try {
      const res = await fetch(`${API}/add-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callerEmail: currentUser?.email,
          targetEmail: adminEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      setAdminSuccess(data.message);
      setAdminEmail("");
      fetchAdmins();
    } catch (err) {
      setAdminError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleRemoveAdmin = async (email) => {
    setAdminError("");
    setAdminSuccess("");
    try {
      const res = await fetch(`${API}/remove-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callerEmail: currentUser?.email,
          targetEmail: email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      setAdminSuccess(data.message);
      fetchAdmins();
    } catch (err) {
      setAdminError(err.message);
    }
  };

  const [settings, setSettings] = useState({
    autoConnect: true,
    killSwitch: true,
    splitTunneling: false,
    dnsLeak: true,
    notifications: true,
    startOnBoot: false,
    darkMode: true,
    analytics: false,
  });





  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");
  const [passwordUpdated, setPasswordUpdated] = useState(false);


  const validatePassword = (pass, userEmail) => {
    const exemptEmails = ["ys5313944@gmail.com", "yahiasaad1904@gmail.com"];
    if (exemptEmails.includes(userEmail)) return true;
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/.test(pass);
  };

  const handleChangePassword = async () => {
    setPassError("");

    const userStr = localStorage.getItem("vpn_user");
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user?.email) {
      setPassError("User not found. Please log in again.");
      return;
    }

    if (!oldPassword) {
      setPassError("Please enter your current password.");
      return;
    }

    if (!validatePassword(newPassword, user.email)) {
      setPassError(
        "New password must be 8+ chars, have upper/lower/special characters",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError("Passwords do not match");
      return;
    }

    setPassLoading(true);
    try {
      // 1. Verify old password matches the one in DB
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (signInError) {
        throw new Error("Incorrect current password. Please try again.");
      }

      // 2. Update password via Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw new Error(error.message);

      try {
        await fetch(`${API}/log-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, action: 'Password Update', details: 'User successfully updated their password via settings' }),
        });
      } catch (logErr) {
        console.warn('Failed to log event', logErr);
      }

      // Success — show thank-you state
      setPasswordUpdated(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordUpdated(false), 5000);
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };





  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));



  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Application Settings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure your Corpo VPN experience
          </p>
        </div>

        <div className="space-y-8">

          <div className="glass-card p-6 border-purple-500/20">
            <SectionHeader
              title="🛡️ Account Security"
              description="Manage your password securely"
            />

            {passwordUpdated ? (
              /* ── Success State ── */
              <div className="space-y-4 animate-fade-in">
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <CheckCircle size={32} className="text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-300 mb-1">
                    Password Updated Successfully
                  </h3>
                  <p className="text-sm text-emerald-400/70">
                    Your password has been changed. Use your new password next
                    time you sign in.
                  </p>
                </div>
              </div>
            ) : (
              /* ── Password Form ── */
              <div className="space-y-6">
                {/* Inline Password Update */}
                <div className="space-y-4">
                  <label className="text-xs text-slate-400 font-medium block">
                    Update Password Directly
                  </label>
                  <div>
                    <label className="text-xs text-slate-400 font-medium mb-1.5 block">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-medium mb-1.5 block">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="8+ chars, upper, lower, special"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-medium mb-1.5 block">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/40"
                    />
                  </div>

                  {passError && (
                    <p className="text-xs text-red-400">❌ {passError}</p>
                  )}

                  <button
                    onClick={handleChangePassword}
                    disabled={passLoading || !oldPassword || !newPassword || !confirmPassword}
                    className="w-full py-3 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {passLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />{" "}
                        Updating...
                      </>
                    ) : (
                      <>Update Password</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PRIVACY */}
          <div className="glass-card p-6">
            <SectionHeader
              title="Privacy & Analytics"
              description="Control what data Corpo VPN collects"
            />
            <div className="space-y-2">
              <ToggleSwitch
                label="Anonymous Usage Reports"
                description="Help improve Corpo VPN with diagnostic logs (no personal data)"
                icon="📊"
                enabled={settings.analytics}
                onToggle={() => toggle("analytics")}
              />
            </div>
            <div className="mt-4 p-3 rounded-xl bg-green-500/8 border border-green-500/15">
              <p className="text-xs text-green-300">
                ✓ Corpo VPN enforces a strict zero-log policy. Your browsing
                activity is never recorded.
              </p>
            </div>
          </div>

          {/* ADMIN MANAGEMENT — Admin Only */}
          {isAdmin && (
            <div className="glass-card p-6 border-amber-500/20">
              <SectionHeader
                title="👑 Admin Management"
                description="Promote or demote admins (admin only)"
              />

              {/* Add admin */}
              <div className="flex gap-3 mb-4">
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Enter email to promote to admin..."
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/40"
                />
                <button
                  onClick={handleAddAdmin}
                  disabled={!adminEmail.trim() || adminLoading}
                  className="px-5 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <UserPlus size={14} />
                  {adminLoading ? "Adding..." : "Add Admin"}
                </button>
              </div>

              {adminError && (
                <p className="text-xs text-red-400 mb-3">❌ {adminError}</p>
              )}
              {adminSuccess && (
                <p className="text-xs text-emerald-400 mb-3">
                  ✅ {adminSuccess}
                </p>
              )}

              {/* Admin list */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
                  Current Admins
                </p>
                {admins.map((a) => (
                  <div
                    key={a.email}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <Crown size={14} className="text-amber-400" />
                      <span className="text-sm text-white font-mono">
                        {a.email}
                      </span>
                      {a.email === "ys5313944@gmail.com" && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                          ROOT
                        </span>
                      )}
                    </div>
                    {a.email !== "ys5313944@gmail.com" &&
                      a.email !== currentUser?.email && (
                        <button
                          onClick={() => handleRemoveAdmin(a.email)}
                          className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1"
                        >
                          <UserMinus size={12} /> Demote
                        </button>
                      )}
                  </div>
                ))}
                {admins.length === 0 && (
                  <p className="text-xs text-slate-600">Loading admins...</p>
                )}
              </div>
            </div>
          )}

          {/* Version info */}
          <div className="text-center text-xs text-slate-700 pb-4">
            Corpo VPN v1.0.0-stable · Build 2026.03.11 · Enterprise License
          </div>
        </div>
      </div>
    </div>
  );
}
