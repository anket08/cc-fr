import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PublicNavbar from '../components/PublicNavbar';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Sparkles, LogIn } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isLogin) {
        const response = await api.post('/auth/login', { email, password });
        login(response.data.accessToken);
        const alreadyOnboarded = localStorage.getItem('cymops_onboarding_complete') === 'true';
        if (alreadyOnboarded) {
          navigate('/dashboard');
        } else {
          // Check role from JWT to route correctly
          try {
            const payload = JSON.parse(atob(response.data.accessToken.split('.')[1]));
            const role = (payload.role || '').replace('ROLE_', '');
            navigate(role === 'ADMIN' ? '/onboarding' : '/user-setup');
          } catch {
            navigate('/user-setup');
          }
        }
      } else {
        const response = await api.post('/auth/register', { email, password, role: 'MEMBER' });
        // New users: always go through setup
        login(response.data.accessToken, true);
        navigate('/user-setup');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    }
  };

  const inputStyle = (field: string) => ({
    width: '100%', padding: '14px 16px 14px 48px',
    background: focusedField === field ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
    border: `1.5px solid ${focusedField === field ? 'rgba(255,104,3,0.5)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '14px', color: '#fff',
    fontSize: '0.9rem', fontFamily: "'Satoshi', sans-serif",
    outline: 'none', transition: 'all 0.3s ease',
    boxSizing: 'border-box' as const,
    boxShadow: focusedField === field ? '0 0 0 4px rgba(255,104,3,0.08), 0 8px 32px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(20px)',
  });

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: '#0B0501',
      position: 'relative', overflowX: 'hidden',
      fontFamily: "'Satoshi', sans-serif",
    }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700&display=swap');
        
        @keyframes authOrbFloat {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes borderGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.2); }
        .auth-btn-primary {
          position: relative;
          overflow: hidden;
        }
        .auth-btn-primary::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          animation: shimmer 3s ease-in-out infinite;
        }
      `}} />

      {/* Atmospheric background */}
      <div style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 50% 30%, rgba(180,80,10,0.14) 0%, transparent 60%),
          radial-gradient(ellipse 40% 40% at 20% 70%, rgba(255,104,3,0.06) 0%, transparent 60%),
          radial-gradient(ellipse 40% 40% at 80% 80%, rgba(254,235,184,0.04) 0%, transparent 60%)
        `,
      }} />

      {/* Floating orb behind the card */}
      <div style={{
        position: 'fixed', top: '45%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,104,3,0.08) 0%, rgba(255,80,10,0.03) 40%, transparent 65%)',
        filter: 'blur(60px)',
        animation: 'authOrbFloat 6s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', paddingTop: '100px', paddingBottom: '38px', paddingLeft: '20px', paddingRight: '20px' }}>

        {/* Shared Public Navbar */}
        <PublicNavbar />

        {/* Auth Card */}
        <motion.div
          className="auth-card-container"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '440px', maxWidth: '100%',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '32px 36px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
            backdropFilter: 'blur(40px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top accent line */}
          <div style={{
            position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,104,3,0.5), transparent)',
            animation: 'borderGlow 3s ease-in-out infinite',
          }} />

          {/* Header with logo */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.2 }}
              style={{ marginBottom: '14px', display: 'inline-block', position: 'relative' }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto'
              }}>
                <div style={{
                  width: '240px', height: "70px",
                  WebkitMaskImage: 'url(/dp.png)',
                  maskImage: 'url(/dp.png)',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  background: '#FFFFFF',
                }} />
              </div>
              {/* Glow behind icon */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100px', height: '100px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,104,3,0.2), transparent 70%)',
                filter: 'blur(20px)', zIndex: -1
              }} />
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
                  {isLogin ? 'Welcome back' : 'Create your account'}
                </h2>
                <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                  {isLogin ? 'Sign in to your command center' : 'Get started with incident response'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                style={{
                  padding: '12px 16px', marginBottom: '20px', borderRadius: '12px',
                  background: 'rgba(255,68,68,0.08)', color: '#FF6B6B', fontSize: '0.8rem', fontWeight: 500,
                  border: '1px solid rgba(255,68,68,0.12)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                <span style={{ fontSize: '14px' }}>⚠️</span> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email field */}
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                marginBottom: '8px',
              }}>Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{
                  position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                  color: focusedField === 'email' ? '#FF6803' : 'rgba(255,255,255,0.25)',
                  transition: 'color 0.3s',
                  zIndex: 1,
                }} />
                <input
                  className="auth-input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={inputStyle('email')}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ position: 'relative' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                marginBottom: '8px',
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{
                  position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                  color: focusedField === 'password' ? '#FF6803' : 'rgba(255,255,255,0.25)',
                  transition: 'color 0.3s',
                  zIndex: 1,
                }} />
                <input
                  className="auth-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={inputStyle('password')}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>


            {/* Submit button */}
            <motion.button
              type="submit"
              className="auth-btn-primary"
              whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(255,104,3,0.4)' }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%', padding: '15px',
                background: 'linear-gradient(135deg, #FF6803, #FF8C32)',
                border: 'none', borderRadius: '14px',
                color: '#fff', fontSize: '0.95rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Satoshi', sans-serif",
                transition: 'all 0.3s ease', marginTop: '4px',
                boxShadow: '0 6px 24px rgba(255,104,3,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {isLogin ? <LogIn size={18} /> : <Sparkles size={18} />}
              {isLogin ? 'Sign in' : 'Create account'}
              <ArrowRight size={16} style={{ marginLeft: '4px' }} />
            </motion.button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
          </div>

          {/* Toggle button */}
          <motion.button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            whileHover={{ borderColor: 'rgba(255,104,3,0.3)', background: 'rgba(255,104,3,0.05)' }}
            style={{
              width: '100%', padding: '13px',
              background: 'rgba(255,255,255,0.02)',
              border: '1.5px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
              fontFamily: "'Satoshi', sans-serif", fontSize: '0.85rem',
              fontWeight: 500, transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span style={{ color: '#FF9A4D', fontWeight: 600 }}>{isLogin ? 'Sign up' : 'Log in'}</span>
          </motion.button>
        </motion.div>

        {/* Footer text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            marginTop: '24px', fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.2)', textAlign: 'center',
          }}
        >
          Protected by enterprise-grade encryption
        </motion.p>
      </div>
    </div>
  );
};

export default AuthPage;
