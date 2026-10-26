import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, AlertCircle, Lock, Mail, User, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";

export const LoginPage: React.FC = () => {
  const {
    loginWithCredentials,
    loginWithGoogle,
    setupFirstAdmin,
    hasAdminInSystem,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "setup">(
    hasAdminInSystem ? "login" : "setup"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("System Administrator");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (!hasAdminInSystem) {
      setMode("setup");
    } else {
      setMode("login");
    }
  }, [hasAdminInSystem]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithCredentials(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Sign in failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Administrator password must be at least 8 characters long.");
      return;
    }
    setSubmitting(true);
    try {
      await setupFirstAdmin({
        fullName,
        email,
        password,
        designation,
      });
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to initialize administrator account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Google Sign-In failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between">
      {/* Top Institutional Bar */}
      <header className="h-16 border-b border-neutral-200 px-6 lg:px-12 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-neutral-300 flex items-center justify-center bg-neutral-50">
            <Building2 className="w-4 h-4 text-neutral-900" />
          </div>
          <span className="text-base font-bold tracking-tight text-neutral-900">
            SSMIET HallSync AI
          </span>
        </div>
        <div className="text-xs text-neutral-500">
          SSM Institute of Engineering and Technology · Dindigul
        </div>
      </header>

      {/* Main Content Split */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Institutional Context */}
          <div className="lg:col-span-7 space-y-6 pr-0 lg:pr-8">
            <div className="text-xs font-medium text-neutral-500">
              Enterprise Academic Infrastructure Portal
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight leading-tight"
              style={{ textWrap: "balance" }}
            >
              Smart Seminar Hall Allotment, Scheduling &amp; Resource Management
            </h1>
            <p className="text-base text-neutral-600 leading-relaxed max-w-xl">
              Centralized reservation and facility management system for SSM Institute
              of Engineering and Technology, Dindigul. Prevent double bookings, track
              audio-visual resources, and coordinate academic events with real-time
              PostgreSQL integrity.
            </p>

            <div className="pt-4 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-lg border border-neutral-200 bg-white">
                <div className="font-semibold text-neutral-900">
                  Conflict-Free Scheduling
                </div>
                <p className="text-xs text-neutral-600 mt-1">
                  Database-level transaction locking prevents overlapping bookings and
                  respects scheduled maintenance blocks.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-neutral-200 bg-white">
                <div className="font-semibold text-neutral-900">
                  Role-Based Governance
                </div>
                <p className="text-xs text-neutral-600 mt-1">
                  Dedicated workflows for Administrators and Faculty members with
                  complete booking history and audit trails.
                </p>
              </div>
            </div>
          </div>

          {/* Right Authentication Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 shadow-xs">
              {!hasAdminInSystem && (
                <div className="mb-6 p-3.5 rounded-lg border border-amber-300 bg-amber-50/70 text-xs text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>First-Time Database Initialization</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    The PostgreSQL database is currently empty and has no administrator
                    registered yet. Create the initial Administrator account below or run{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">
                      npm run setup-admin
                    </code>
                    .
                  </p>
                </div>
              )}

              {!hasAdminInSystem && (
                <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("setup");
                      setError(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      mode === "setup"
                        ? "bg-white text-neutral-900 shadow-xs"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    Initialize First Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      mode === "login"
                        ? "bg-white text-neutral-900 shadow-xs"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    Sign In
                  </button>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold text-neutral-900">
                  {mode === "setup"
                    ? "Create Initial Administrator"
                    : "Sign In to HallSync"}
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  {mode === "setup"
                    ? "Provision the primary administrator account for SSMIET Dindigul."
                    : "Enter your institutional credentials or sign in with Google."}
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3 rounded-lg border border-red-200 bg-red-50 flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {mode === "setup" ? (
                <form onSubmit={handleSetupAdminSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Dr. R. Kumar"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Institutional Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@ssmiet.ac.in"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="System Administrator / Principal"
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Password (minimum 8 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    {submitting
                      ? "Initializing Administrator..."
                      : "Initialize Administrator Account"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="faculty@ssmiet.ac.in"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Signing in..." : "Sign In with Email"}
                  </button>
                </form>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-neutral-500">
                    Or institutional SSO
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-white border border-neutral-300 text-neutral-800 text-sm font-medium rounded-lg hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Continue with Google Account</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Institutional Footer */}
      <footer className="py-4 px-6 lg:px-12 border-t border-neutral-200 bg-white flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
        <div>
          © {new Date().getFullYear()} SSM Institute of Engineering and Technology, Dindigul.
        </div>
        <div>
          SSMIET HallSync AI · Seminar Hall &amp; Resource Management System
        </div>
      </footer>
    </div>
  );
};
