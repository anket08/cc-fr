import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Globe, Menu, X } from 'lucide-react';

const PublicNavbar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navLinks = [
        { label: 'Home', to: '/' },
        { label: 'About', to: '/about' },
        { label: 'Services', to: '/services', dropdown: true },
        { label: 'Blog', to: '/blog', sup: '4' },
        { label: 'Pricing', to: '/pricing' },
    ];

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="public-nav" style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
            padding: '24px 48px',
            display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
            background: 'transparent',
        }}>
            {/* Left: Logo */}
            <div
                onClick={() => navigate('/')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', justifySelf: 'start' }}
            >
                <div style={{
                  width: '115px', height: '70px',
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

            {/* Center: Pill nav bar */}
            <div className="public-nav-pills" style={{
                display: 'flex', alignItems: 'center', gap: '8px', justifySelf: 'center',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '100px',
                padding: '6px 8px',
                backdropFilter: 'blur(20px)',
            }}>
                {navLinks.map((link) => {
                    const isActive = location.pathname === link.to;
                    return (
                        <button
                            key={link.label}
                            onClick={() => navigate(link.to)}
                            style={{
                                background: isActive ? 'radial-gradient(ellipse at bottom, rgba(255,104,3,0.15) 0%, transparent 70%)' : 'transparent',
                                border: 'none',
                                borderRadius: '100px',
                                padding: '6px 18px',
                                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                                fontSize: '13px',
                                fontWeight: 400,
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                fontFamily: "'Satoshi', sans-serif",
                                display: 'flex', alignItems: 'center', gap: '4px',
                                whiteSpace: 'nowrap' as const,
                                textShadow: isActive ? '0 0 10px rgba(255,104,3,0.4)' : 'none',
                            }}
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
                            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                        >
                            {link.label}
                            {link.sup && <sup style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginLeft: '2px', top: '-0.3em' }}>{link.sup}</sup>}
                            {link.dropdown && <ChevronDown size={13} style={{ opacity: 0.5, marginLeft: '-2px' }} />}
                        </button>
                    );
                })}

                {/* Language / Globe */}
                <button
                    style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '100px',
                        padding: '6px 16px',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '13px',
                        fontWeight: 400,
                        cursor: 'pointer',
                        fontFamily: "'Satoshi', sans-serif",
                        display: 'flex', alignItems: 'center', gap: '6px',
                        marginLeft: '4px',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                >
                    <Globe size={13} /> English <ChevronDown size={12} style={{ opacity: 0.5 }} />
                </button>
            </div>

            {/* Right: Login button & Mobile Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifySelf: 'end' }}>
                <button
                    className="public-nav-login"
                    onClick={() => navigate('/login')}
                    style={{
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '100px',
                        padding: '8px 24px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 400,
                        cursor: 'pointer',
                        fontFamily: "'Satoshi', sans-serif",
                        transition: 'all 0.3s',
                        backdropFilter: 'blur(20px)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                    Login / Register
                </button>
                <button
                    className={`mobile-menu-toggle animated-hamburger ${mobileMenuOpen ? 'open' : ''}`}
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'none', width: '26px', height: '18px', position: 'relative', zIndex: 101, outline: 'none' }}
                >
                    <span className="hamburger-line top-line"></span>
                    <span className="hamburger-line middle-line"></span>
                    <span className="hamburger-line bottom-line"></span>
                </button>
            </div>

            {/* Mobile Dropdown Overlay Menu */}
            {mobileMenuOpen && (
                <div
                    className="public-nav-mobile-overlay"
                    style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'rgba(11, 5, 1, 0.95)',
                        backdropFilter: 'blur(30px)',
                        display: 'none', flexDirection: 'column', gap: '16px',
                        padding: '24px 32px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                    }}
                >
                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.to;
                        return (
                            <button
                                key={link.label}
                                onClick={() => { setMobileMenuOpen(false); navigate(link.to); }}
                                style={{
                                    background: 'transparent', border: 'none',
                                    color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                                    fontSize: '18px', fontWeight: 500,
                                    textAlign: 'left', padding: '8px 0',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}
                            >
                                <span>
                                    {link.label}
                                    {link.sup && <sup style={{ fontSize: '10px', color: 'var(--accent)', marginLeft: '4px' }}>{link.sup}</sup>}
                                </span>
                                {link.dropdown && <ChevronDown size={18} style={{ opacity: 0.5 }} />}
                            </button>
                        );
                    })}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
                    <button
                        style={{
                            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)',
                            fontSize: '16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <Globe size={18} /> English
                    </button>
                </div>
            )}
        </nav>
    );
};

export default PublicNavbar;
