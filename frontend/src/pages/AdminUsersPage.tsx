import React, { useState, useEffect } from 'react';
import { Users, Shield, ShieldOff, Edit, Save, X, Search, Clock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  const [editMode, setEditMode] = useState(false);
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      if (Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        setUsers([]);
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setNickname(user.nickname || '');
    setBio(user.bio || '');
    setNewPassword('');
    setEditMode(false);
  };

  const handleSaveChanges = async () => {
    try {
      if (nickname !== selectedUser.nickname || bio !== selectedUser.bio) {
        await api.put(`/admin/users/${selectedUser.id}/profile`, { nickname, bio });
      }
      if (newPassword.trim()) {
        await api.put(`/admin/users/${selectedUser.id}/password`, { password: newPassword });
      }
      toast.success('User updated successfully');
      setEditMode(false);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update user');
    }
  };

  const toggleUserStatus = async (user: any) => {
    try {
      if (user.disabled) {
        await api.post(`/admin/users/${user.id}/enable`);
        toast.success(`User ${user.email} enabled`);
      } else {
        await api.post(`/admin/users/${user.id}/disable`);
        toast.success(`User ${user.email} disabled`);
      }
      fetchUsers();
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, disabled: !user.disabled });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to change user status');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    (u.nickname && u.nickname.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="admin-users-container" style={{ maxWidth: '1000px', marginInline: 'auto', display: 'flex', gap: '24px', minHeight: '80vh' }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 768px) {
          .admin-users-container {
            flex-direction: column !important;
          }
        }
      `}} />
      {/* ─── Left Side: User List ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(255,104,3,0.2), rgba(255,104,3,0.05))',
            border: '1px solid rgba(255,104,3,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FF6803',
          }}>
            <Users size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>User Management</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              {users.length} total users
            </p>
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            className="input-modern"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 36px', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: '12px', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            All Users
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No users found</div>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: selectedUser?.id === user.id ? 'var(--accent-subtle)' : 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)',
                      position: 'relative'
                    }}>
                      {user.nickname ? user.nickname[0].toUpperCase() : user.email[0].toUpperCase()}
                      {user.disabled && (
                        <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--danger)', width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--bg-surface)' }} />
                      )}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {user.nickname || user.email.split('@')[0]}
                        {user.role === 'ADMIN' && <Shield size={10} color="#FF6803" />}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{user.email}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── Right Side: User Details ─── */}
      <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
        <AnimatePresence mode="popLayout">
          {selectedUser ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                borderRadius: '16px', overflow: 'hidden',
              }}
            >
              <div style={{
                padding: '24px', borderBottom: '1px solid var(--border-default)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px'
              }}>
                <div>
                  <h2 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800 }}>{selectedUser.email}</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="badge badge-primary">{selectedUser.role}</span>
                    {selectedUser.disabled ? (
                      <span className="badge" style={{ background: 'var(--danger-subtle)', color: 'var(--danger)' }}>Disabled</span>
                    ) : (
                      <span className="badge" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>Active</span>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                      Joined {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => toggleUserStatus(selectedUser)}
                    className="btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.75rem', color: selectedUser.disabled ? 'var(--success)' : 'var(--danger)' }}
                  >
                    {selectedUser.disabled ? <CheckCircle size={14} /> : <ShieldOff size={14} />}
                    <span style={{ marginLeft: '6px' }}>{selectedUser.disabled ? 'Enable User' : 'Disable User'}</span>
                  </button>
                  {!editMode && (
                    <button onClick={() => setEditMode(true)} className="btn-pill" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                      <Edit size={14} style={{ marginRight: '6px' }} /> Edit Info
                    </button>
                  )}
                </div>
              </div>

              <div style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gap: '20px' }}>
                  {/* Nickname */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Display Name
                    </label>
                    {editMode ? (
                      <input className="input-modern" value={nickname} onChange={e => setNickname(e.target.value)} style={{ width: '100%', padding: '10px' }} />
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.9rem', color: selectedUser.nickname ? '#fff' : 'var(--text-tertiary)' }}>
                        {selectedUser.nickname || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Bio */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Bio
                    </label>
                    {editMode ? (
                      <textarea className="input-modern" value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ width: '100%', padding: '10px', resize: 'vertical' }} />
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.9rem', color: selectedUser.bio ? '#fff' : 'var(--text-tertiary)', lineHeight: 1.5 }}>
                        {selectedUser.bio || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Password Reset */}
                  {editMode && (
                    <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Reset Password
                      </label>
                      <input 
                        type="password"
                        autoComplete="new-password"
                        className="input-modern" 
                        placeholder="Enter new password to reset" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        style={{ width: '100%', padding: '10px', borderColor: newPassword ? 'var(--warning)' : undefined }} 
                      />
                      <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        Leave blank to keep existing password.
                      </p>
                    </div>
                  )}
                </div>

                {/* Edit Controls */}
                {editMode && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '32px' }}>
                    <button onClick={() => setEditMode(false)} className="btn-ghost" style={{ flex: 1, padding: '10px' }}>
                      Cancel
                    </button>
                    <button onClick={handleSaveChanges} className="btn-pill" style={{ flex: 1, padding: '10px', background: 'var(--primary)', color: '#fff' }}>
                      <Save size={14} style={{ marginRight: '6px' }} /> Save Changes
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', border: '1px dashed var(--border-default)', borderRadius: '16px' }}>
              <Users size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Select a user to view details</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminUsersPage;
