import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef(null);

  const location = useLocation();
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setProfileOpen(false);
      navigate('/signin');
    } catch (err) {
      console.error('Sign out error', err);
    }
  };

  const isActivePath = (path) => location.pathname === path;

  const AuthControls = () => {
    if (loading) {
      return (
        <div className="hidden md:flex items-center space-x-4">
          <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse"></div>
        </div>
      );
    }

    if (user) {
      const displayName = user.displayName || user.email?.split('@')[0] || 'User';
      const initials = (user.displayName || user.email || '')
        .split(/[\s@]/)
        .map(s => s && s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      return (
        <div className="hidden md:flex items-center space-x-3 relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-lg group"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white to-green-50 text-green-700 flex items-center justify-center font-bold text-sm shadow-md group-hover:shadow-lg transition-shadow">
              {initials || 'U'}
            </div>
            <div className="text-white text-sm font-medium hidden lg:block">{displayName}</div>
            <i className={`fas fa-chevron-down text-white text-xs transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`}></i>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-3 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
                    {initials || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <Link
                  to="/dashboard"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 rounded-xl transition-colors duration-200"
                >
                  <i className="fas fa-tachometer-alt w-4 text-gray-400"></i>
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 rounded-xl transition-colors duration-200"
                >
                  <i className="fas fa-user-circle w-4 text-gray-400"></i>
                  <span>Profile Settings</span>
                </Link>
              </div>
              <div className="p-2 border-t border-gray-100">
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200 font-medium"
                >
                  <i className="fas fa-sign-out-alt w-4"></i>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="hidden md:flex items-center space-x-3">
        <Link
          to="/signin"
          className="text-white hover:text-green-100 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-white/10"
        >
          Sign In
        </Link>
        <Link
          to="/signup"
          className="text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm px-5 py-2 rounded-xl text-sm font-semibold border border-white/30 transition-all duration-200 hover:scale-105 hover:shadow-lg"
        >
          Sign Up
        </Link>
      </div>
    );
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20'
          : 'bg-gradient-to-r from-green-600/95 to-emerald-700/95 backdrop-blur-md'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-md group-hover:blur-lg transition-all duration-300"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-white to-green-50 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                <i className="fas fa-leaf text-green-600 text-lg"></i>
              </div>
            </div>
            <span
              className={`ml-3 font-bold text-xl transition-colors duration-300 ${scrolled ? 'text-gray-900' : 'text-white'
                }`}
            >
              GreenSync
            </span>
          </Link>

          {/* Centered Navigation Links */}
          <div className="hidden md:flex flex-1 justify-center">
            <div className="flex space-x-1">
              {[
                { path: '/', label: 'Home', icon: 'fa-home' },
                { path: '/dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
                { path: '/analytics', label: 'Analytics', icon: 'fa-chart-line' },
                { path: '/about', label: 'About', icon: 'fa-info-circle' },
                { path: '/contact', label: 'Contact', icon: 'fa-envelope' },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActivePath(link.path)
                      ? scrolled
                        ? 'text-green-700 bg-green-50'
                        : 'text-white bg-white/20'
                      : scrolled
                        ? 'text-gray-700 hover:text-green-700 hover:bg-green-50'
                        : 'text-white/90 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <span className="flex items-center space-x-2">
                    <i className={`fas ${link.icon} text-xs`}></i>
                    <span>{link.label}</span>
                  </span>
                  {isActivePath(link.path) && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-current rounded-full"></div>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Right-side auth controls */}
          <AuthControls />

          {/* Mobile menu toggle */}
          <div className="flex items-center md:hidden">
            <button
              onClick={toggleMenu}
              className={`inline-flex items-center justify-center p-2 rounded-xl transition-all duration-200 ${scrolled
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-white hover:bg-white/20'
                }`}
              aria-label="Toggle menu"
            >
              <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="px-4 pt-2 pb-4 space-y-1 bg-white/95 backdrop-blur-xl border-t border-white/20 shadow-lg">
          {[
            { path: '/', label: 'Home', icon: 'fa-home' },
            { path: '/dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
            { path: '/analytics', label: 'Analytics', icon: 'fa-chart-line' },
            { path: '/about', label: 'About', icon: 'fa-info-circle' },
            { path: '/contact', label: 'Contact', icon: 'fa-envelope' },
          ].map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${isActivePath(link.path)
                  ? 'text-green-700 bg-green-50'
                  : 'text-gray-700 hover:text-green-700 hover:bg-green-50'
                }`}
            >
              <i className={`fas ${link.icon} w-5 text-sm`}></i>
              <span>{link.label}</span>
            </Link>
          ))}

          <div className="pt-3 mt-3 border-t border-gray-200">
            {user ? (
              <>
                <div className="px-4 py-3 mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
                      {(user.displayName || user.email || '')
                        .split(/[\s@]/)
                        .map(s => s && s[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user.displayName || user.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
                >
                  <i className="fas fa-sign-out-alt w-5"></i>
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50 transition-all duration-200"
                >
                  <i className="fas fa-sign-in-alt w-5"></i>
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md"
                >
                  <i className="fas fa-user-plus w-5"></i>
                  <span>Sign Up</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;