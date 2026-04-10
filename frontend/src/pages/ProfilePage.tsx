import React, { useState, useEffect } from 'react';
import { User, PenLine, Save, ArrowLeft, Shield, Mail, Calendar, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const ProfilePage: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [originalNickname, setOriginalNickname] = useState('');
  const [originalBio, setOriginalBio] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/me');
      setNickname(res.data.nickname || '');
      setBio(res.data.bio || '');
      setEmail(res.data.email || '');
      setRole((res.data.role || '').replace('ROLE_', ''));
      setCreatedAt(res.data.createdAt || '');
      setOriginalNickname(res.data.nickname || '');
      setOriginalBio(res.data.bio || '');
    } catch {
      // Fallback to JWT decode
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setEmail(payload.sub || '');
          setRole((payload.role || '').replace('ROLE_', ''));
        } catch { }
      }
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      toast.error('Nickname cannot be empty');
      return;
    }
    setLoading(true);
    try {
      await api.put('/users/me/profile', { nickname: nickname.trim(), bio: bio.trim() });
      toast.success('Profile updated!');
      setOriginalNickname(nickname.trim());
      setOriginalBio(bio.trim());
      setEditing(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNickname(originalNickname);
    setBio(originalBio);
    setEditing(false);
  };

  const initial = nickname ? nickname[0].toUpperCase() : email ? email[0].toUpperCase() : 'U';
  const isAdmin = role === 'ADMIN';
  const hasChanges = nickname !== originalNickname || bio !== originalBio;

  return (
    <div style={{ maxWidth: '720px', marginInline: 'auto' }}>

      {/* ─── Header ─── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(255,104,3,0.2), rgba(255,104,3,0.05))',
            border: '1px solid rgba(255,104,3,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FF6803',
          }}>
            <User size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Profile</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Manage your personal information
            </p>
          </div>
        </div>
      </div>

      {/* ─── Profile Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: '16px', overflow: 'hidden', marginBottom: '20px',
        }}
      >
        {/* Banner + Avatar */}
        <div style={{
          height: '100px',
          background: isAdmin
            ? 'linear-gradient(135deg, rgba(255,104,3,0.3), rgba(255,160,80,0.1))'
            : 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.05))',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', bottom: '-36px', left: '24px',
            width: '72px', height: '72px', borderRadius: '50%',
            background: isAdmin
              ? 'linear-gradient(135deg, #FF9A4D, #FF6803)'
              : 'linear-gradient(135deg, rgba(108,92,231,0.8), rgba(108,92,231,0.5))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', fontWeight: 800, color: '#fff',
            border: '3px solid var(--bg-surface)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>
            {initial}
          </div>
        </div>

        {/* Info Section */}
        <div style={{ padding: '48px 24px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                {nickname || email?.split('@')[0] || 'User'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isAdmin && <Shield size={12} color="#FF6803" />}
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600,
                  color: isAdmin ? '#FF6803' : 'var(--text-tertiary)',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                  {role || 'MEMBER'}
                </span>
              </div>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="btn-pill"
                style={{ padding: '7px 16px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PenLine size={13} /> Edit Profile
              </button>
            )}
          </div>

          {/* Detail rows */}
          <div style={{
            display: 'grid', gap: '16px',
            borderTop: '1px solid var(--border-subtle)', paddingTop: '20px',
          }}>
            {/* Email */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-tertiary)', flexShrink: 0,
              }}>
                <Mail size={15} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</p>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#fff', fontWeight: 500 }}>{email}</p>
              </div>
            </div>

            {/* Nickname */}
            <div style={{ display: 'flex', alignItems: editing ? 'flex-start' : 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-tertiary)', flexShrink: 0,
              }}>
                <PenLine size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nickname</p>
                {editing ? (
                  <input
                    className="input-modern"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder="Your display name"
                    style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
                    maxLength={50}
                  />
                ) : (
                  <p style={{ margin: 0, fontSize: '0.88rem', color: nickname ? '#fff' : 'var(--text-tertiary)', fontWeight: 500, fontStyle: nickname ? 'normal' : 'italic' }}>
                    {nickname || 'Not set'}
                  </p>
                )}
              </div>
            </div>

            {/* Bio */}
            <div style={{ display: 'flex', alignItems: editing ? 'flex-start' : 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-tertiary)', flexShrink: 0,
              }}>
                <Briefcase size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bio</p>
                {editing ? (
                  <textarea
                    className="input-modern"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="A short bio about yourself"
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 12px', fontSize: '0.85rem',
                      resize: 'vertical', fontFamily: 'inherit',
                    }}
                    maxLength={300}
                  />
                ) : (
                  <p style={{ margin: 0, fontSize: '0.88rem', color: bio ? '#fff' : 'var(--text-tertiary)', fontWeight: 500, fontStyle: bio ? 'normal' : 'italic', lineHeight: 1.5 }}>
                    {bio || 'No bio set'}
                  </p>
                )}
              </div>
            </div>

            {/* Member since */}
            {createdAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-tertiary)', flexShrink: 0,
                }}>
                  <Calendar size={15} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Member Since</p>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#fff', fontWeight: 500 }}>
                    {new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Save/Cancel buttons when editing */}
          {editing && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={handleCancel}
                className="btn-ghost"
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !hasChanges || !nickname.trim()}
                style={{
                  flex: 2, padding: '12px',
                  background: hasChanges && nickname.trim() ? 'linear-gradient(135deg, #FF6803, #FF9A4D)' : 'rgba(255,255,255,0.06)',
                  border: 'none', borderRadius: '10px',
                  color: '#fff', fontSize: '0.85rem', fontWeight: 700,
                  cursor: hasChanges && nickname.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s',
                }}
              >
                <Save size={14} /> {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
