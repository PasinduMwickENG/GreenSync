import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { auth, db } from "../../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { toast } from "sonner";

export default function SignUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location?.state?.from?.pathname || "/setup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  // Debug status shown during signup flows to help diagnose issues in dev
  const [debugStatus, setDebugStatus] = useState("");

  // Password strength indicator
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, label: "", color: "" };
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 10) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 1) return { strength: 1, label: "Weak", color: "bg-red-500" };
    if (strength <= 2) return { strength: 2, label: "Fair", color: "bg-orange-500" };
    if (strength <= 3) return { strength: 3, label: "Good", color: "bg-yellow-500" };
    return { strength: 4, label: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  const validate = () => {
    if (!name.trim()) return "Full name is required";
    if (!email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirm) return "Passwords do not match";
    return null;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) {
      setError(v);
      toast.error(v);
      return;
    }

    setLoading(true);
    try {
      console.log('SignUp: creating user for', email);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      console.log('SignUp: created user', cred?.user?.uid);
      const user = cred.user;

      // Save profile with a fallback timeout to prevent infinite "stuck" state
      try {
        setDebugStatus("Saving profile...");
        console.log('SignUp: saving profile data to Firestore...');

        const savePromise = setDoc(doc(db, "users", user.uid), {
          name: name.trim(),
          email: email.trim(),
          createdAt: new Date(),
          modules: []
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout: Profile save taking too long")), 5000)
        );

        await Promise.race([savePromise, timeoutPromise]);
        console.log('SignUp: profile successfully saved');
      } catch (writeErr) {
        console.error('SignUp: Profile save issue:', writeErr);
        // If it's just a timeout, we might still proceed but warn the user
        if (writeErr.message.includes("Timeout")) {
          toast.warning("Profile saving is taking longer than expected. Proceeding to setup...");
        } else {
          toast.error("Account created, but could not save profile details.");
          // We'll proceed anyway because the Auth account is created, 
          // and Setup.jsx uses setDoc({merge:true}) which will fix it.
        }
      }

      setDebugStatus("Success! Redirecting...");
      toast.success("Account created successfully");
      console.log("SignUp: Success! Navigating to:", from);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('SignUp: Auth error:', err);
      const msg = err?.message || "Sign up failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setDebugStatus("");
    }
  };

  const isFormValid = name.trim() && email.trim() && password.length >= 6 && password === confirm;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-8 sm:py-16 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-teal-200/30 to-green-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-100/20 to-emerald-100/20 rounded-full blur-3xl"></div>
      </div>

      <section className="w-full max-w-[480px] mx-auto relative z-10">
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
            <h1 id="signup-heading" className="text-3xl font-bold text-gray-900 mb-2">
              Create your account
            </h1>
            <p className="text-sm text-gray-600">
              Join GreenSync and start managing your smart home
            </p>
          </div>

          <form onSubmit={handleSignUp} noValidate className="space-y-5" aria-labelledby="signup-heading">
            {/* Name Input */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                Full name
              </label>
              <div className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition-opacity ${nameFocused ? 'opacity-20' : ''}`}></div>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors">
                  <i className="fas fa-user"></i>
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  required
                  className="relative w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none bg-white transition-all duration-200 text-gray-900 placeholder:text-gray-400"
                  placeholder="John Doe"
                />
              </div>
            </div>

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
                  placeholder="At least 6 characters"
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
              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-1 animate-in fade-in-50 duration-200">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${level <= passwordStrength.strength
                          ? passwordStrength.color
                          : 'bg-gray-200'
                          }`}
                      ></div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className={`font-medium ${passwordStrength.strength === 1 ? 'text-red-600' :
                      passwordStrength.strength === 2 ? 'text-orange-600' :
                        passwordStrength.strength === 3 ? 'text-yellow-600' :
                          'text-green-600'
                      }`}>
                      {passwordStrength.label}
                    </span>
                    <span>password strength</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label htmlFor="confirm" className="block text-sm font-semibold text-gray-700">
                Confirm password
              </label>
              <div className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition-opacity ${confirmFocused ? 'opacity-20' : ''}`}></div>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors">
                  <i className="fas fa-lock"></i>
                </div>
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  required
                  className="relative w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none bg-white transition-all duration-200 text-gray-900 placeholder:text-gray-400"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors p-1 rounded-lg hover:bg-green-50"
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  <i className={`fas ${showConfirm ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
              {/* Password Match Indicator */}
              {confirm && (
                <div className="animate-in fade-in-50 duration-200">
                  {password === confirm ? (
                    <p className="text-xs text-green-600 flex items-center gap-1.5">
                      <i className="fas fa-check-circle"></i>
                      <span>Passwords match</span>
                    </p>
                  ) : (
                    <p className="text-xs text-red-600 flex items-center gap-1.5">
                      <i className="fas fa-times-circle"></i>
                      <span>Passwords do not match</span>
                    </p>
                  )}
                </div>
              )}
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
              disabled={loading || !isFormValid}
              className="relative w-full py-3.5 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              {loading ? (
                <>
                  <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <i className="fas fa-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
                </>
              )}
            </button>

            {/* Sign In Link */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-center text-gray-600">
                Already have an account?
                {" "}
                <Link
                  to="/signin"
                  className="text-green-600 hover:text-green-700 font-semibold transition-colors hover:underline underline-offset-2"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Terms Footer */}
        <p className="text-xs text-center text-gray-500 mt-6 px-4">
          By creating an account, you agree to our{" "}
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