import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { toast } from "sonner";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location?.state?.from?.pathname || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Signed in successfully");
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err?.message || "Unable to sign in";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email to reset password");
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success("Password reset email sent");
      setResetMode(false);
    } catch (err) {
      toast.error(err?.message || "Reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-8 sm:py-16 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-teal-200/30 to-green-200/30 rounded-full blur-3xl"></div>
      </div>

      <section className="w-full max-w-[440px] mx-auto relative z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 sm:p-10 shadow-xl border border-white/20 transition-all duration-300 hover:shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-5 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl blur-md opacity-50 animate-pulse"></div>
              <div className="relative w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
                <span className="sr-only">GreenSync</span>
                <i className="fas fa-leaf text-white text-2xl" aria-hidden="true"></i>
              </div>
            </div>
            <h1 id="signin-heading" className="text-3xl font-bold text-gray-900 mb-2">
              {resetMode ? "Reset Password" : "Welcome back"}
            </h1>
            <p className="text-sm text-gray-600">
              {resetMode ? "We'll send you a reset link" : "Sign in to continue to your account"}
            </p>
          </div>

          {/* Main Form */}
          {!resetMode ? (
            <form onSubmit={handleSignIn} noValidate className="space-y-5" aria-labelledby="signin-heading">
              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                  Email address
                </label>
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition-opacity ${emailFocused ? 'opacity-20' : ''}`}></div>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    required
                    className="relative w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none bg-white transition-all duration-200 text-gray-900 placeholder:text-gray-400"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition-opacity ${passwordFocused ? 'opacity-20' : ''}`}></div>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors">
                    <i className="fas fa-lock"></i>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    className="relative w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none bg-white transition-all duration-200 text-gray-900 placeholder:text-gray-400"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors p-1 rounded-lg hover:bg-green-50"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div role="alert" className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-in slide-in-from-top-2 duration-300">
                  <p className="text-sm text-red-700 flex items-start gap-2">
                    <i className="fas fa-exclamation-circle mt-0.5 flex-shrink-0"></i>
                    <span>{error}</span>
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="relative w-full py-3.5 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                {loading ? (
                  <>
                    <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <i className="fas fa-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
                  </>
                )}
              </button>

              {/* Footer Links */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setResetMode(true)}
                  className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors hover:underline underline-offset-2"
                >
                  Forgot password?
                </button>
                <Link
                  to="/signup"
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors hover:underline underline-offset-2"
                >
                  Create account
                </Link>
              </div>
            </form>
          ) : (
            // Reset Password Form
            <form onSubmit={handleReset} className="space-y-6 animate-in fade-in-50 duration-300">
              <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                <p className="text-sm text-blue-900 flex items-start gap-2">
                  <i className="fas fa-info-circle mt-0.5 flex-shrink-0"></i>
                  <span>Enter your email address and we'll send you a link to reset your password.</span>
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-700">
                  Email address
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none bg-white transition-all duration-200 text-gray-900 placeholder:text-gray-400"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={resetLoading || !email}
                  className="flex-1 py-3.5 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {resetLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Sending…
                    </span>
                  ) : (
                    "Send reset link"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setResetMode(false)}
                  className="flex-1 py-3.5 px-4 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 active:scale-[0.98]"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Terms Footer */}
        <p className="text-xs text-center text-gray-500 mt-6 px-4">
          By continuing, you agree to our{" "}
          <a href="#" className="text-green-600 hover:text-green-700 font-medium hover:underline underline-offset-2 transition-colors">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-green-600 hover:text-green-700 font-medium hover:underline underline-offset-2 transition-colors">
            Privacy Policy
          </a>
          .
        </p>
      </section>
    </main>
  );
}