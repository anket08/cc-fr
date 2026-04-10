import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  Bell,
  Search,
  LogOut,
  Shield,
  TicketCheck,
  MessageSquare,
  ChevronRight,
  Activity,
  Wifi,
  PanelLeftClose,
  PanelLeft,
  Menu,
  Terminal,
  Rocket,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';

// @ts-ignore
import SockJS from 'sockjs-client/dist/sockjs';
import { Client } from '@stomp/stompjs';

const SIDEBAR_KEY = 'cymops_sidebar_collapsed';

export const Layout: React.FC = () => {
  const { logout, token } = useAuth();
  const onboardingComplete = localStorage.getItem('cymops_onboarding_complete') === 'true';
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  const [invites, setInvites] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [roomNotifs, setRoomNotifs] = useState<any[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sidebar toggle — persisted in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_KEY) === 'true';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  };

  const readRoomNotifs = () => {
    const raw = localStorage.getItem('cymops_room_notifs');
    setRoomNotifs(raw ? JSON.parse(raw) : []);
  };

  // Connect STOMP for global notifications
  useEffect(() => {
    if (!token || !userEmail) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        client.subscribe(`/topic/users/${userEmail}`, (msg) => {
          const parsed = JSON.parse(msg.body);

          // Skip if user is currently viewing this room
          if (window.location.pathname.includes(`/rooms/${parsed.roomId}`)) {
            return;
          }

          const NOTIF_KEY = 'cymops_room_notifs';
          const existing = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
          const idx = existing.findIndex((n: any) => n.roomId === parsed.roomId);
          const isMine = parsed.sender === userEmail;
          const entry = { roomId: parsed.roomId, count: 1, lastMsg: parsed.content, sender: parsed.sender, isMine, ts: Date.now() };

          if (idx >= 0) {
            existing[idx] = { ...existing[idx], ...entry, count: existing[idx].count + 1 };
          } else {
            existing.push(entry);
          }

          // Intelligent Notification Routing
          if (!isMine) {
            const contentStr = parsed.content || '';
            const isSev1 = parsed.severity === 'SEV1';
            const isMentioned = contentStr.includes('@' + userEmail.split('@')[0]) || contentStr.includes('@all');

            if (isSev1) {
              // Instant alert sound + popup
              try {
                const audio = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
                audio.volume = 0.5;
                audio.play().catch(() => { });
              } catch (e) { }

              toast.error(`S1 CRITICAL ALERT: Room #${parsed.roomId}\n${parsed.content}`, {
                icon: '🚨',
                duration: 8000
              });
            } else if (isMentioned) {
              // Mention -> browser notification or simple alert
              if (Notification.permission === 'granted') {
                new Notification('You were mentioned in CyMOPS', { body: parsed.content });
              } else {
                toast(`You were mentioned in Room #${parsed.roomId}: ${parsed.content}`, {
                  icon: '🔔',
                  duration: 5000
                });
              }
            }
            // SEV2 and SEV3 fall through to silent notification (just the unread badge!)
          }

          localStorage.setItem(NOTIF_KEY, JSON.stringify(existing));
          window.dispatchEvent(new Event('cymops_notif_update'));
        });
      }
    });

    client.activate();
    return () => { client.deactivate(); };
  }, [token, userEmail]);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(payload.sub || '');
        setUserRole((payload.role || '').replace('ROLE_', ''));
      } catch (e) { }
    }
    fetchPendingInvites();
    fetchProjects();
    readRoomNotifs();
    window.addEventListener('cymops_notif_update', readRoomNotifs);

    // Request notification permission for intelligent notifications
    if (Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    return () => window.removeEventListener('cymops_notif_update', readRoomNotifs);
  }, [token]);

  const fetchPendingInvites = async () => {
    try {
      const res = await api.get('/invites/me');
      setInvites(res.data);
      setPendingCount(res.data.length);
    } catch (e) { }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (e) { }
  };

  const handleAcceptInvite = async (id: number) => {
    try {
      await api.post(`/invites/${id}/accept`);
      fetchPendingInvites();
      fetchProjects();
      setShowNotifications(false);
      toast.success('Invite accepted');
    } catch (e) { toast.error('Failed to accept invite'); }
  };

  const handleRejectInvite = async (id: number) => {
    try {
      await api.post(`/invites/${id}/reject`);
      fetchPendingInvites();
      toast.success('Invite rejected');
    } catch (e) { toast.error('Failed to reject invite'); }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initial = userEmail ? userEmail[0].toUpperCase() : 'U';
  const isAdmin = userRole === 'ADMIN';
  const totalNotifCount = pendingCount + roomNotifs.length;
  const filteredProjects = searchQuery.trim()
    ? projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const sidebarWidth = sidebarCollapsed ? '64px' : '260px';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#0B0501', fontFamily: "'Satoshi', sans-serif" }}>

      {/* Background Glow */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 60% 50% at 15% 50%, rgba(255,104,3,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 50% 50% at 85% 30%, rgba(22,244,86,0.04) 0%, transparent 60%),
          radial-gradient(ellipse 70% 60% at 50% 90%, rgba(254,235,184,0.03) 0%, transparent 70%)
        `,
      }} />

      {/* Mobile Overlay */}
      {isMobile && !sidebarCollapsed && (
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9, backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside style={{
        width: isMobile ? (sidebarCollapsed ? '0px' : '260px') : sidebarWidth,
        minWidth: isMobile ? (sidebarCollapsed ? '0px' : '260px') : sidebarWidth,
        position: isMobile ? 'absolute' : 'relative',
        height: '100%', left: 0, top: 0,
        boxShadow: isMobile && !sidebarCollapsed ? '4px 0 24px rgba(0,0,0,0.8)' : 'none',
        background: 'rgba(11,5,1,0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s ease',
        transform: isMobile && sidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        zIndex: 10,
      }}>
        {/* Brand Header */}
        <div style={{
          padding: sidebarCollapsed ? '20px 0 16px' : '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          flexShrink: 0,
        }}>
          {sidebarCollapsed ? (
            <button
              onClick={toggleSidebar}
              className="btn-ghost"
              title="Expand sidebar"
              style={{ padding: '6px', borderRadius: '6px' }}
            >
              <PanelLeft size={18} />
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
                <div style={{
                  width: '140px', height: '40px',
                  WebkitMaskImage: 'url(/dp.png)',
                  maskImage: 'url(/dp.png)',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'left center',
                  maskPosition: 'left center',
                  background: '#FFFFFF',
                }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {/* Collapse button */}
                <button
                  onClick={toggleSidebar}
                  className="btn-ghost"
                  title="Collapse sidebar"
                  style={{ padding: '5px', borderRadius: '6px' }}
                >
                  <PanelLeftClose size={16} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, padding: sidebarCollapsed ? '12px 8px 0' : '12px 12px 0', overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Section: Plan */}
          {!sidebarCollapsed && (
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.15em', padding: '4px 12px 6px', margin: 0, whiteSpace: 'nowrap' }}>
              Planning
            </p>
          )}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginBottom: '20px' }}>
            {[
              { to: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Overview' },
              { to: '/projects', icon: <FolderKanban size={16} />, label: 'Projects', count: projects.length > 0 ? projects.length : undefined },
              { to: '/issues', icon: <TicketCheck size={16} />, label: 'Issues' },
              { to: '/grafana', icon: <Activity size={16} />, label: 'Telemetry' },
              { to: '/uptime', icon: <Wifi size={16} />, label: 'Uptime' },
              ...(isAdmin ? [
                { to: '/users', icon: <Users size={16} />, label: 'Users' },
                { to: '/agent-setup', icon: <Terminal size={16} />, label: 'Agent Setup' }
              ] : []),
            ].map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                title={sidebarCollapsed ? link.label : undefined}
                onClick={() => { if (isMobile) setSidebarCollapsed(true); }}
                style={sidebarCollapsed ? {
                  justifyContent: 'center',
                  padding: '10px',
                  marginLeft: 0,
                  paddingLeft: '10px',
                  borderLeft: 'none',
                  borderRadius: 'var(--radius-md)',
                } : undefined}
              >
                {link.icon}
                {!sidebarCollapsed && (
                  <>
                    {link.label}
                    {link.count !== undefined && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>{link.count}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Section: Quick links for existing projects */}
          {!sidebarCollapsed && projects.length > 0 && (
            <>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.15em', padding: '4px 12px 6px', margin: 0 }}>
                Your Projects
              </p>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginBottom: '20px' }}>
                {projects.slice(0, 5).map((p: any) => (
                  <NavLink key={p.id} to={`/projects/${p.id}`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={() => { if (isMobile) setSidebarCollapsed(true); }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '4px',
                      background: `hsl(${(p.id * 67) % 360}, 50%, 35%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {p.name?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <span className="text-truncate">{p.name}</span>
                    <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.3, flexShrink: 0 }} />
                  </NavLink>
                ))}
              </nav>
            </>
          )}

          {/* Collapsed project icons */}
          {sidebarCollapsed && projects.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
              {projects.slice(0, 5).map((p: any) => (
                <NavLink
                  key={p.id}
                  to={`/projects/${p.id}`}
                  title={p.name}
                  style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: `hsl(${(p.id * 67) % 360}, 50%, 35%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {p.name?.[0]?.toUpperCase() || 'P'}
                </NavLink>
              ))}
            </div>
          )}

          {/* Onboarding incomplete prompt */}
          {!sidebarCollapsed && !onboardingComplete && (
            <div
              onClick={() => navigate(isAdmin ? '/onboarding' : '/user-setup')}
              style={{
                padding: '10px 12px', margin: '0 0 12px',
                background: 'linear-gradient(135deg, rgba(108,92,231,0.12), rgba(108,92,231,0.05))',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(108,92,231,0.25)',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(108,92,231,0.45)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(108,92,231,0.25)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Rocket size={13} color="var(--accent-text)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-text)' }}>
                  {isAdmin ? 'Finish setup' : 'Set up profile'}
                </span>
                <ChevronRight size={11} color="var(--accent-text)" style={{ marginLeft: 'auto' }} />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {isAdmin ? 'Connect your agent to go live' : 'Set your nickname and bio'}
              </p>
            </div>
          )}

          {/* Pending Invites */}
          {!sidebarCollapsed && pendingCount > 0 && (
            <div style={{
              padding: '10px 12px', margin: '0 0 12px',
              background: 'rgba(255,104,3,0.06)', borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255,104,3,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={14} color="#FF6803" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
                  {pendingCount} pending invite{pendingCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Footer (Profile Dropdown) */}
        <div style={{ position: 'relative', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {showProfileMenu && !sidebarCollapsed && (
            <div
              className="animate-entrance"
              style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', left: '12px', right: '12px',
                background: 'rgba(11,5,1,0.95)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius-lg)', padding: '6px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100,
                backdropFilter: 'blur(20px)',
              }}>
              <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: '4px' }}>
                <p style={{ margin: '0 0 2px', fontSize: '12px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>Signed in as</p>
                <p className="text-truncate" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{userEmail}</p>
              </div>

              <button onClick={() => { setShowProfileMenu(false); if (isMobile) setSidebarCollapsed(true); navigate('/profile'); }} className="sidebar-link" style={{ padding: '8px 12px', margin: 0, width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <User size={14} /> Profile
              </button>
              <button onClick={() => { setShowProfileMenu(false); if (isMobile) setSidebarCollapsed(true); handleLogout(); }} className="sidebar-link" style={{ padding: '8px 12px', margin: 0, width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', color: '#FF4444' }}>
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}

          <div
            onClick={() => sidebarCollapsed ? toggleSidebar() : setShowProfileMenu(!showProfileMenu)}
            style={{
              margin: sidebarCollapsed ? '8px' : '12px',
              padding: sidebarCollapsed ? '8px' : '10px 12px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              background: showProfileMenu && !sidebarCollapsed ? 'rgba(255,255,255,0.04)' : 'transparent',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${showProfileMenu && !sidebarCollapsed ? 'rgba(255,255,255,0.06)' : 'transparent'}`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { if (!showProfileMenu) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={(e) => { if (!showProfileMenu) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: isAdmin ? 'linear-gradient(135deg, #FF9A4D, #FF6803)' : 'rgba(255,104,3,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.8rem', color: '#fff', flexShrink: 0,
              boxShadow: isAdmin ? '0 0 10px rgba(255,104,3,0.4)' : 'none'
            }}>
              {initial}
            </div>
            {!sidebarCollapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="text-truncate" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{userEmail}</p>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                  {isAdmin && <Shield size={10} color="#FF6803" />}
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>{userRole || 'Member'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'visible', position: 'relative', background: '#0B0501', zIndex: 1 }}>

        {/* ─── Topbar ─── */}
        <header style={{
          height: '52px',
          background: 'rgba(11,5,1,0.6)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 12px' : '0 22px',
          flexShrink: 0,
          position: 'relative',
          zIndex: 8,
          backdropFilter: 'blur(20px)',
        }}>
          {/* Left side: toggle + search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            {/* Mobile/collapsed toggle in topbar */}
            {(sidebarCollapsed || isMobile) && (
              <button
                onClick={toggleSidebar}
                className="btn-ghost"
                title="Open sidebar"
                style={{ padding: '6px', borderRadius: '6px' }}
              >
                <Menu size={18} />
              </button>
            )}
            {/* Search */}
            <div style={{ position: 'relative', width: isMobile ? '100%' : '280px', maxWidth: '280px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
              <input
                className="input-modern"
                placeholder="Search incidents, projects..."
                value={searchQuery}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim() !== '') {
                    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                    setSearchQuery('');
                    setIsSearchFocused(false);
                  }
                }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                style={{ width: '100%', paddingLeft: '32px', padding: '6px 12px 6px 32px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', borderWidth: '1px' }}
              />
              {isSearchFocused && searchQuery.trim() !== '' && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                  background: 'rgba(11,5,1,0.95)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 'var(--radius-md)', padding: '4px', zIndex: 50,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)',
                }}>
                  <div style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>
                    Press Enter to Smart Search
                  </div>
                  {filteredProjects.length > 0 && (
                    filteredProjects.map(p => (
                      <div key={p.id}
                        className="search-item"
                        style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchQuery('');
                          setIsSearchFocused(false);
                          navigate(`/projects/${p.id}`);
                        }}>
                        <FolderKanban size={14} color="#FF6803" />
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.8rem', color: '#fff' }}>{p.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>Project · #{p.id}</div>
                        </div>
                      </div>
                    ))
                  )}
                  {filteredProjects.length === 0 && (
                    <div style={{ padding: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)' }}>No matching projects</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Notifications */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
            <button className="btn-ghost" style={{ position: 'relative', padding: '6px' }} onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={16} />
              {totalNotifCount > 0 && (
                <span style={{
                  position: 'absolute', top: '1px', right: '1px',
                  minWidth: '14px', height: '14px', borderRadius: '7px',
                  background: '#FF4444', color: '#fff',
                  fontSize: '0.55rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                  border: '2px solid rgba(11,5,1,0.95)',
                }}>
                  {totalNotifCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                width: '360px', background: 'rgba(11,5,1,0.95)',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)',
                zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                overflow: 'hidden', backdropFilter: 'blur(20px)',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Notifications</h3>
                  {totalNotifCount > 0 && <span className="badge badge-orange">{totalNotifCount} new</span>}
                </div>

                <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  {/* Invite notifications */}
                  {invites.map(inv => {
                    const roleName = (inv.role || '').replace('ROLE_', '') || 'MEMBER';
                    const projectName = inv.projectName || `Project #${inv.projectId}`;
                    return (
                      <div key={inv.id} style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,104,3,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FolderKanban size={14} color="#FF6803" />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{projectName}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
                              Invited as <span style={{ fontWeight: 600, color: '#FF6803' }}>{roleName}</span>
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleAcceptInvite(inv.id)} className="btn-pill" style={{ flex: 1, padding: '6px', fontSize: '0.75rem' }}>
                            Accept
                          </button>
                          <button onClick={() => handleRejectInvite(inv.id)} className="btn-pill-dark" style={{ flex: 1, padding: '6px', fontSize: '0.75rem' }}>
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Room activity */}
                  {roomNotifs.map((notif: any) => (
                    <div key={notif.roomId}
                      className="search-item"
                      style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                      onClick={() => { setShowNotifications(false); navigate(`/rooms/${notif.roomId}`); }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: 'rgba(22,244,86,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <MessageSquare size={14} color="#16F456" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>Room #{notif.roomId}</p>
                          <p className="text-truncate" style={{ margin: '1px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
                            {notif.isMine ? 'You' : (notif.sender?.split('@')[0] || 'Someone')}: {notif.lastMsg}
                          </p>
                        </div>
                        <span className="badge badge-green">{notif.count}</span>
                      </div>
                    </div>
                  ))}

                  {/* Empty */}
                  {invites.length === 0 && roomNotifs.length === 0 && (
                    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                      <Bell size={24} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '8px' }} />
                      <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.25)' }}>All caught up</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ─── Page Content ─── */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden', background: '#0B0501' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto', padding: isMobile ? '16px' : '24px 28px' }}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};
