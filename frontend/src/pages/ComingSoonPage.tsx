import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';

const ComingSoonPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const pageName = location.pathname.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Page';

    return (
        <div style={{
            minHeight: '100vh', width: '100%',
            background: '#0B0501', fontFamily: "'Satoshi', sans-serif",
            position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
            {/* Shared Public Navbar */}
            <PublicNavbar />
            {/* Background glow */}
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                pointerEvents: 'none', zIndex: 0,
                background: `
                    radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,104,3,0.12) 0%, transparent 70%),
                    radial-gradient(ellipse 50% 50% at 85% 30%, rgba(22,244,86,0.05) 0%, transparent 60%)
                `,
            }} />

            {/* Animated ring */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                style={{
                    position: 'absolute',
                    width: '400px', height: '400px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255,104,3,0.08)',
                    zIndex: 0,
                }}
            />
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                style={{
                    position: 'absolute',
                    width: '550px', height: '550px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255,104,3,0.05)',
                    zIndex: 0,
                }}
            />

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '40px' }}>

                {/* Pulsing icon */}
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, type: 'spring', stiffness: 200 }}
                    style={{ marginBottom: '32px', display: 'inline-block' }}
                >
                    <motion.div
                        animate={{
                            boxShadow: [
                                '0 0 0 0 rgba(255,104,3,0.3)',
                                '0 0 0 20px rgba(255,104,3,0)',
                                '0 0 0 0 rgba(255,104,3,0)',
                            ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(255,104,3,0.15), rgba(255,154,77,0.1))',
                            border: '1px solid rgba(255,104,3,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Sparkles size={32} color="#FF6803" />
                    </motion.div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    style={{
                        fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                        fontWeight: 700, color: '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: '-0.03em',
                        lineHeight: 1.15,
                        marginBottom: '16px',
                    }}
                >
                    Coming Soon
                </motion.h1>

                {/* Page name pill */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        background: 'rgba(255,104,3,0.08)',
                        border: '1px solid rgba(255,104,3,0.2)',
                        borderRadius: '100px', padding: '8px 20px',
                        marginBottom: '24px',
                    }}
                >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF6803', boxShadow: '0 0 8px #FF6803' }} />
                    <span style={{ color: '#FF6803', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{pageName}</span>
                </motion.div>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    style={{
                        color: 'rgba(255,255,255,0.45)',
                        fontSize: '1.1rem', fontWeight: 400,
                        maxWidth: '500px', margin: '0 auto 40px',
                        lineHeight: 1.7,
                    }}
                >
                    We're building something incredible. This feature is currently under active development and will be available soon.
                </motion.p>

                {/* Animated progress bar */}
                <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: '240px' }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    style={{
                        height: '3px', borderRadius: '2px',
                        background: 'rgba(255,255,255,0.06)',
                        margin: '0 auto 40px', overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            position: 'absolute', top: 0, left: 0,
                            width: '40%', height: '100%',
                            background: 'linear-gradient(90deg, transparent, #FF6803, transparent)',
                            borderRadius: '2px',
                        }}
                    />
                </motion.div>

                {/* Back button */}
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    onClick={() => navigate('/')}
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '10px', padding: '12px 28px',
                        color: '#fff', fontSize: '0.9rem', fontWeight: 500,
                        cursor: 'pointer', fontFamily: "'Satoshi', sans-serif",
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <ArrowLeft size={16} /> Back to Home
                </motion.button>
            </div>
        </div>
    );
};

export default ComingSoonPage;
