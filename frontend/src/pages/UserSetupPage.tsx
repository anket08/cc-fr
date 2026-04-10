import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Sparkles, ArrowRight, Camera, PenLine, Globe, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const UserSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { markOnboardingComplete } = useAuth();

  const [step, setStep] = useState(0); // 0 = welcome, 1 = profile, 2 = done
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(payload.sub || '');
        // Pre-fill nickname from email
        const emailName = (payload.sub || '').split('@')[0];
        setNickname(emailName);
      } catch { }
    }

    // Fetch existing profile data
    api.get('/users/me').then(res => {
      if (res.data.nickname) setNickname(res.data.nickname);
      if (res.data.bio) setBio(res.data.bio);
    }).catch(() => { });
  }, []);

  const handleSaveProfile = async () => {
    if (!nickname.trim()) {
      toast.error('Please enter a nickname');
      return;
    }
    setLoading(true);
    try {
      await api.put('/users/me/profile', { nickname: nickname.trim(), bio: bio.trim() });
      toast.success('Profile saved!');
      setStep(2);
      markOnboardingComplete();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const initial = nickname ? nickname[0].toUpperCase() : userEmail ? userEmail[0].toUpperCase() : 'U';

  return (
    <div style={{ maxWidth: '660px', marginInline: 'auto', padding: '40px 20px' }}>
      <AnimatePresence mode="wait">
        {/* ─── Step 0: Welcome ─── */}
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '24px', margin: '0 auto 24px',
                background: 'linear-gradient(135deg, rgba(255,104,3,0.2), rgba(255,160,80,0.08))',
                border: '1px solid rgba(255,104,3,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={36} color="#FF6803" />
              </div>
              <h1 style={{ margin: '0 0 10px', fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
                Welcome to CyMOPS! 🎉
              </h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '1rem', lineHeight: 1.6 }}>
                Let's set up your profile so your team knows who you are.
                <br />This will only take a minute.
              </p>
            </div>

            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: '16px', padding: '24px', marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <User size={18} color="var(--accent-text)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>What you'll set up</span>
              </div>
              {[
                { icon: <PenLine size={14} />, text: 'Your display nickname' },
                { icon: <Briefcase size={14} />, text: 'A short bio about yourself' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 0',
                  borderBottom: i < 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: 'rgba(255,104,3,0.1)', border: '1px solid rgba(255,104,3,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#FF6803',
                  }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{item.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(1)}
              style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(135deg, #FF6803, #FF9A4D)',
                border: 'none', borderRadius: '12px',
                color: '#fff', fontSize: '1rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              Let's Go <ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {/* ─── Step 1: Profile Form ─── */}
        {step === 1 && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                Set Up Your Profile
              </h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>
                Tell us a bit about yourself
              </p>
            </div>

            {/* Avatar Preview */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '88px', height: '88px', borderRadius: '50%', margin: '0 auto 12px',
                background: 'linear-gradient(135deg, #FF9A4D, #FF6803)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', fontWeight: 800, color: '#fff',
                boxShadow: '0 8px 32px rgba(255,104,3,0.3)',
                position: 'relative',
              }}>
                {initial}
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
                {userEmail}
              </p>
            </div>

            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: '16px', padding: '24px', marginBottom: '24px',
            }}>
              {/* Nickname */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block', marginBottom: '8px', fontSize: '0.78rem',
                  fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Nickname *
                </label>
                <input
                  className="input-modern"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="e.g. John, DevOps_King, CyberWolf"
                  style={{ width: '100%', padding: '12px 14px', fontSize: '0.9rem' }}
                  maxLength={50}
                />
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)' }}>
                  This is how your team will see you. {nickname.length}/50
                </p>
              </div>

              {/* Bio */}
              <div>
                <label style={{
                  display: 'block', marginBottom: '8px', fontSize: '0.78rem',
                  fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Bio
                </label>
                <textarea
                  className="input-modern"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell your team about yourself... (e.g. DevOps Engineer at Acme Corp, loves Kubernetes)"
                  rows={4}
                  style={{
                    width: '100%', padding: '12px 14px', fontSize: '0.85rem',
                    resize: 'vertical', minHeight: '100px', fontFamily: 'inherit',
                  }}
                  maxLength={300}
                />
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)' }}>
                  A short description about you. {bio.length}/300
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep(0)}
                className="btn-ghost"
                style={{
                  flex: 1, padding: '14px',
                  borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Back
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={loading || !nickname.trim()}
                style={{
                  flex: 2, padding: '14px',
                  background: nickname.trim() ? 'linear-gradient(135deg, #FF6803, #FF9A4D)' : 'rgba(255,255,255,0.06)',
                  border: 'none', borderRadius: '12px',
                  color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                  cursor: nickname.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {loading ? 'Saving…' : 'Save Profile'} <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 2: Done ─── */}
        {step === 2 && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            style={{ textAlign: 'center' }}
          >
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(22,244,86,0.15), rgba(22,244,86,0.05))',
              border: '2px solid rgba(22,244,86,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 0 40px rgba(22,244,86,0.15)',
            }}>
              <span style={{ fontSize: '3rem' }}>✅</span>
            </div>

            <h1 style={{ margin: '0 0 12px', fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
              You're all set, {nickname}!
            </h1>
            <p style={{ margin: '0 0 32px', color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Your profile is ready. You can update it anytime from
              the Profile section in the sidebar.
            </p>

            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '14px 40px',
                background: 'linear-gradient(135deg, #FF6803, #FF9A4D)',
                border: 'none', borderRadius: '12px',
                color: '#fff', fontSize: '1rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              Go to Dashboard <ArrowRight size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserSetupPage;
