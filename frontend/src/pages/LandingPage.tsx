import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import {
    ChevronRight, ChevronDown, Terminal, Zap, Shield, Lock, Database,
    Bell, Server, SquareKanban,
    MessageCircle, Circle, ExternalLink, Globe,
    Mail, Phone, Code, Activity, Cloud, Fingerprint, Cpu, Network,
    FileText, Sparkles
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════════════ */
const landingCSS = `
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700&display=swap');

html, body, #root {
    overflow: auto !important;
    height: auto !important;
}

@keyframes orbPulse {
    0%, 100% {
        box-shadow:
            0 0 80px rgba(255,104,3,0.08),
            0 0 200px rgba(255,104,3,0.04),
            inset 0 0 60px rgba(255,104,3,0.05);
    }
    50% {
        box-shadow:
            0 0 120px rgba(255,104,3,0.14),
            0 0 300px rgba(255,104,3,0.06),
            inset 0 0 80px rgba(255,104,3,0.08);
    }
}

@keyframes gradientFlow {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

@keyframes floatIcon {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
}

@keyframes fieryPulse {
    0%, 100% {
        filter: blur(30px) brightness(1);
        transform: translate(-50%, -50%) scale(1);
    }
    50% {
        filter: blur(40px) brightness(1.3);
        transform: translate(-50%, -50%) scale(1.15);
    }
}

@keyframes fieryGlowOuter {
    0%, 100% {
        filter: blur(40px) brightness(1);
        opacity: 0.8;
    }
    50% {
        filter: blur(50px) brightness(1.2);
        opacity: 1;
    }
}

@keyframes logoBreath {
    0%, 100% {
        filter: drop-shadow(0 0 20px rgba(255,255,255,0.9)) drop-shadow(0 0 50px rgba(255,140,50,0.8)) drop-shadow(0 0 100px rgba(255,104,3,0.5));
    }
    50% {
        filter: drop-shadow(0 0 30px rgba(255,255,255,1)) drop-shadow(0 0 70px rgba(255,140,50,1)) drop-shadow(0 0 130px rgba(255,104,3,0.7));
    }
}

/* ── Timeline container ── */
.landing-timeline-container {
    display: flex;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 5%;
    position: relative;
}
.landing-timeline-rail {
    width: 2px;
    position: relative;
    margin-right: 60px;
    flex-shrink: 0;
}
.landing-timeline-node {
    position: absolute;
    left: -82px;
    top: 84px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(11,5,1,0.9);
    border: 1px solid rgba(255,104,3,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 15px rgba(255,104,3,0.15);
}

/* ── Section titles ── */
.landing-title {
    font-size: clamp(1.8rem, 3vw, 2.8rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.2;
    color: #fff;
    text-transform: uppercase;
    font-family: 'Satoshi', sans-serif;
}

/* ── Code box (terminal style) ── */
.landing-code-box {
    padding: 20px 24px;
    font-family: monospace;
    font-size: 0.82rem;
    line-height: 1.9;
    color: rgba(255,255,255,0.85);
    overflow-x: auto;
}

/* ── Footer link hover ── */
.landing-footer-link {
    color: rgba(255,255,255,0.45);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-family: 'Satoshi', sans-serif;
    font-weight: 400;
}
.landing-footer-link:hover { color: #fff; }

@media (max-width: 768px) {
    .landing-timeline-container { flex-direction: column; }
    .landing-timeline-rail { display: none; }
    .landing-timeline-node { display: none !important; }
    .hero-stat-card { display: none !important; }
    .landing-title { font-size: 2.2rem !important; }
}
`;

/* ═══════════════════════════════════════════════════════
   Components
   ═══════════════════════════════════════════════════════ */

interface SectionProps {
    title: string;
    subtitle: string;
    text: string;
    icon: React.ReactNode;
    visual: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, subtitle, text, icon, visual }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { margin: "-20%", once: true });

    return (
        <div ref={ref} style={{ padding: '80px 0', position: 'relative' }}>
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="landing-timeline-node"
            >
                {icon}
            </motion.div>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}
            >
                <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.35)' }}>{subtitle}</div>
                <h2 className="landing-title">{title}</h2>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: '600px', marginBottom: '32px', fontWeight: 400, fontFamily: "'Satoshi', sans-serif" }}>{text}</p>
                {visual}
            </motion.div>
        </div>
    );
};

interface CodeBoxProps {
    title: string;
    content: React.ReactNode;
    color?: string;
}

const CodeBox: React.FC<CodeBoxProps> = ({ title, content, color = "#FF6803" }) => (
    <div style={{ background: 'rgba(11,5,1,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', maxWidth: '700px', width: '100%', backdropFilter: 'blur(10px)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Satoshi', sans-serif" }}>
                <Terminal size={14} color={color} /> {title}
            </span>
        </div>
        <div className="landing-code-box">
            {content}
        </div>
    </div>
);

/* ═══════════════════════════════════════════════════════
   Main Landing Page
   ═══════════════════════════════════════════════════════ */
const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
    const scrollProgressToUse = isMobileDevice ? { get: () => 0, onChange: () => () => {}, onRenderRequest: () => {}, destroy: () => {}, clearListeners: () => {}, updateAndNotify: () => {}, set: () => {}, getVelocity: () => 0, current: 0 } as any : scrollYProgress; // Dummy motion value if needed, but best just to not use it
    const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const [showTnc, setShowTnc] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

    // Animation stage for floating icons to logo transition
    // 0 = Icons float in, 1 = Fly to center, 2 = Explosion flash, 3 = Logo grows from orb
    const [animationStage, setAnimationStage] = useState(0);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    React.useEffect(() => {
        const t1 = setTimeout(() => setAnimationStage(1), 3000);  // icons fly to center
        const t2 = setTimeout(() => setAnimationStage(2), 3800);  // explosion
        const t3 = setTimeout(() => setAnimationStage(3), 4400);  // flash fades, logo grows
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, []);

    // Override the global overflow:hidden
    React.useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const root = document.getElementById('root');

        const prev = {
            html: html.style.overflow,
            body: body.style.overflow,
            root: root ? root.style.overflow : '',
            htmlH: html.style.height,
            bodyH: body.style.height,
            rootH: root ? root.style.height : '',
        };

        html.style.overflow = 'auto';
        body.style.overflow = 'auto';
        if (root) root.style.overflow = 'auto';
        html.style.height = 'auto';
        body.style.height = 'auto';
        if (root) root.style.height = 'auto';

        return () => {
            html.style.overflow = prev.html || '';
            body.style.overflow = prev.body || '';
            if (root) root.style.overflow = prev.root;
            html.style.height = prev.htmlH || '';
            body.style.height = prev.bodyH || '';
            if (root) root.style.height = prev.rootH;
        };
    }, []);

    // Horizontal icon row (like the reference – flat row across the orb)
    const iconSymbols = [
        { icon: <Database strokeWidth={1.5} />, delay: 0.0 },
        { icon: <Network strokeWidth={1.5} />, delay: 0.3 },
        { icon: <Server strokeWidth={1.5} />, delay: 0.6 },
        { icon: <Terminal strokeWidth={1.5} />, delay: 0.9 },
        { icon: <Activity strokeWidth={1.5} />, delay: 1.2 },
        { icon: <Code strokeWidth={1.5} />, delay: 1.5 },
        { icon: <Cpu strokeWidth={1.5} />, delay: 1.8 },
        { icon: <Fingerprint strokeWidth={1.5} />, delay: 2.1 },
    ];

    return (
        <div ref={containerRef} style={{
            background: '#0B0501', color: '#fff', minHeight: '300vh',
            fontFamily: "'Satoshi', sans-serif",
            position: 'relative', overflowX: 'hidden',
        }}>
            <style dangerouslySetInnerHTML={{ __html: landingCSS }} />

            {/* ═══ Background atmospheric glow — strong warm amber halo ═══ */}
            <div style={{
                position: 'fixed', top: 0, left: 0,
                width: '100%', height: '100%',
                pointerEvents: 'none', zIndex: 0,
                background: `
                    radial-gradient(ellipse 90% 70% at 50% 35%, rgba(160,70,5,0.22) 0%, transparent 55%),
                    radial-gradient(ellipse 60% 50% at 50% 30%, rgba(255,120,30,0.12) 0%, transparent 50%),
                    radial-gradient(ellipse 120% 80% at 50% 40%, rgba(100,45,5,0.15) 0%, transparent 65%),
                    radial-gradient(ellipse 40% 30% at 15% 70%, rgba(255,104,3,0.04) 0%, transparent 60%),
                    radial-gradient(ellipse 40% 30% at 85% 75%, rgba(254,200,100,0.03) 0%, transparent 60%)
                `,
            }} />

            {/* All content z-index: 1 */}
            <div style={{ position: 'relative', zIndex: 1 }}>

                {/* ═══════════════ Changelog Modal ═══════════════ */}
                <AnimatePresence>
                    {isChangelogOpen && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setIsChangelogOpen(false)}
                                style={{ position: 'absolute', inset: 0, background: 'rgba(11, 5, 1, 0.8)', backdropFilter: 'blur(8px)' }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                style={{ position: 'relative', width: '100%', maxWidth: '520px', background: 'rgba(11,5,1,0.95)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.5)', zIndex: 10, backdropFilter: 'blur(20px)' }}
                            >
                                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Circle size={20} color="#FF6803" /> Changelog (Phase 3)
                                    </h3>
                                    <button onClick={() => setIsChangelogOpen(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', padding: '4px', fontSize: '1.2rem' }}>✕</button>
                                </div>
                                <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {[
                                            { v: 'Latest — Phase 3', text: 'Kanban boards, Sprint management, Issue tracking with drag-and-drop', active: true },
                                            { v: 'Phase 2.5', text: 'Smart Search, multi-project dashboard, user-specific data isolation' },
                                            { v: 'Phase 2', text: 'Pending invite system, online/last-seen tracking, multi-page layout' },
                                            { v: 'Phase 1.5', text: 'WebSocket chat with Redis pub/sub broadcast across instances' },
                                            { v: 'Phase 1.4', text: 'JWT refresh tokens, audit logging, rate limiting' },
                                            { v: 'Phase 1.3', text: 'Role-based access control (ADMIN / MEMBER)' },
                                            { v: 'Phase 1.2', text: 'Incident room CRUD, message persistence, project members' },
                                            { v: 'Phase 1.0', text: 'Spring Boot init, JWT auth, Flyway + PostgreSQL schema' },
                                        ].map((item, i) => (
                                            <div key={i} style={{ borderLeft: '2px solid rgba(255,255,255,0.06)', paddingLeft: '16px', position: 'relative' }}>
                                                <div style={{ position: 'absolute', left: '-5px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: item.active ? '#16F456' : 'rgba(255,255,255,0.1)', boxShadow: item.active ? '0 0 10px #16F456' : 'none' }} />
                                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>{item.v}</div>
                                                <div style={{ color: 'rgba(255,255,255,0.85)', fontWeight: item.active ? 500 : 400 }}>{item.text}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ═══════════════ NAVBAR — shared public navbar ═══════════════ */}
                <PublicNavbar />

                {/* ═══════════════ HERO SECTION (Coinery Exact Match) ═══════════════ */}
                <header style={{
                    minHeight: '100vh', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'flex-start', textAlign: 'center',
                    padding: '0', position: 'relative', overflow: 'hidden'
                }}>
                    {/* Background Faint Star Dust */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
                        background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 1px, transparent 1px)',
                        backgroundSize: '40px 40px', opacity: 0.5, zIndex: 0
                    }} />

                    {/* ── MASSIVE BACKGROUND ORB ── */}
                    {/* Center of the orb is high up. The bottom curve has the bright orange rim. */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            position: 'absolute',
                            bottom: '65vh', left: '50%', transform: 'translateX(-50%)',
                            width: isMobile ? '160vw' : '130vw', height: isMobile ? '160vw' : '130vw', maxWidth: '1600px', maxHeight: '1600px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle at 50% 50%, rgba(20,8,2,1) 0%, rgba(10,4,1,1) 30%, #0B0501 70%)',
                            borderBottom: '4px solid rgba(255,140,50,0.8)',
                            boxShadow: isMobile ? 'none' : '0 40px 100px rgba(255,110,20,0.1), inset 0 -40px 100px rgba(255,100,0,0.15)',
                            zIndex: 1,
                        }}
                    >
                        {/* Soft wide orange halo just above the bottom rim */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0, left: '20%', right: '20%', height: '20%',
                            borderRadius: '50%',
                            background: 'radial-gradient(ellipse at bottom, rgba(255,120,40,0.4) 0%, transparent 70%)',
                            filter: isMobile ? 'none' : 'blur(30px)'
                        }} />
                        {/* Faint side glows */}
                        <div style={{
                            position: 'absolute',
                            bottom: '10%', left: '0', right: '0', height: '100%',
                            borderRadius: '50%',
                            boxShadow: 'inset 0 -20px 80px rgba(255, 104, 3, 0.2)',
                            pointerEvents: 'none'
                        }} />
                    </motion.div>

                    {/* ─ MASSIVE 4-POINTED STAR (shrinks when logo appears) ─ */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: animationStage >= 2 ? 0 : 1,
                            scale: animationStage >= 2 ? 0.1 : 1
                        }}
                        transition={animationStage >= 2
                            ? { duration: 0.5, ease: 'easeIn' }
                            : { duration: 1.2, delay: 0.3, ease: 'easeOut' }
                        }
                        style={{
                            position: 'absolute', top: '35vh', left: '50%',
                            transform: 'translate(-50%, -50%)', zIndex: 3,
                            display: 'flex', justifyContent: 'center', alignItems: 'center'
                        }}
                    >
                        {/* Outer massive orange glow */}
                        <div style={{ position: 'absolute', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,104,3,0.3) 0%, transparent 60%)', filter: 'blur(40px)' }} />

                        {/* Horizontal Beam */}
                        <div style={{
                            position: 'absolute', width: '320px', height: '6px',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7) 35%, #fff 50%, rgba(255,255,255,0.7) 65%, transparent)',
                            borderRadius: '50%', filter: 'blur(1px)'
                        }} />
                        {/* Vertical Beam */}
                        <div style={{
                            position: 'absolute', width: '6px', height: '420px',
                            background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.7) 35%, #fff 50%, rgba(255,255,255,0.7) 65%, transparent)',
                            borderRadius: '50%', filter: 'blur(1px)'
                        }} />
                        {/* Center Diamond Core */}
                        <div style={{
                            position: 'absolute', width: '40px', height: '40px', background: '#fff',
                            transform: 'rotate(45deg)', borderRadius: '8px',
                            boxShadow: isMobile ? 'none' : '0 0 40px 15px rgba(255,255,255,0.9), 0 0 80px 30px rgba(255,104,3,0.6)'
                        }} />
                    </motion.div>

                    {/* ─ FLOATING ICONS ROW (Merge Animation) ─ */}
                    <div style={{ position: 'absolute', top: '35vh', left: '50%', zIndex: 4, transform: 'translateY(-50%)' }}>
                        {iconSymbols.map((icon, i) => {
                            const isIconMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
                            const isCenter = i === 3 || i === 4;
                            const sizeStr = isIconMobile ? '32px' : (isCenter ? '54px' : '44px');
                            const sizeNum = isIconMobile ? 32 : (isCenter ? 54 : 44);

                            let xPos;
                            if (isIconMobile) {
                                // Phone: Equidistant spacing securely within screen width using pixels, avoiding center orb
                                const gap = 32; // px apart for the groups
                                const centerAvoidance = 32; // extra push from center
                                let offsetPx = (i - 3.5) * gap;
                                if (i < 4) offsetPx -= centerAvoidance;
                                else offsetPx += centerAvoidance;
                                xPos = `${offsetPx - sizeNum / 2}px`;
                            } else {
                                // Desktop/Tablet: Equidistant using vw
                                const offsets = [-35, -25, -15, -5, 5, 15, 25, 35];
                                const distance = offsets[i];
                                xPos = `calc(${distance}vw - ${sizeNum / 2}px)`;
                            }

                            const centerPos = `-${sizeNum / 2}px`;

                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 30, left: xPos }}
                                    animate={{
                                        opacity: animationStage >= 2 ? 0 : 1,
                                        scale: animationStage >= 2 ? 0 : 1,
                                        y: 0,
                                        left: animationStage === 0 ? xPos : centerPos
                                    }}
                                    transition={{
                                        left: { duration: 0.8, ease: "easeInOut" },
                                        opacity: { duration: animationStage >= 2 ? 0.2 : 0.6, delay: animationStage >= 2 ? 0 : 0.6 + i * 0.1 },
                                        scale: { duration: 0.2 },
                                        y: { duration: 0.6, delay: 0.6 + i * 0.1 }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        width: sizeStr, height: sizeStr,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'rgba(255,255,255,0.9)',
                                        backdropFilter: isIconMobile ? 'none' : 'blur(16px)',
                                        boxShadow: isIconMobile ? 'none': '0 4px 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.1)',
                                        pointerEvents: 'auto' as const,
                                        marginTop: `-${sizeNum / 2}px`
                                    }}
                                >
                                    <div style={{ transform: isMobile ? 'scale(0.7)' : (isCenter ? 'scale(1.1)' : 'scale(0.9)'), display: 'flex' }}>
                                        {icon.icon}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* ─ EXPLOSION FLASH ─ */}
                    <AnimatePresence>
                        {animationStage === 2 && (
                            <div style={{
                                position: 'absolute', top: '35vh', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 15, pointerEvents: 'none'
                            }}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.5, 3, 4] }}
                                    transition={{ duration: 0.6, ease: 'easeOut', times: [0, 0.2, 0.6, 1] }}
                                    style={{
                                        width: '120px', height: '120px', borderRadius: '50%',
                                        background: 'radial-gradient(circle, #fff 0%, rgba(255,180,80,0.8) 40%, transparent 70%)',
                                        boxShadow: isMobile ? '0 0 60px 30px rgba(255,255,255,0.6), 0 0 100px 50px rgba(255,140,50,0.3)' : '0 0 120px 60px rgba(255,255,255,0.8), 0 0 200px 100px rgba(255,140,50,0.4)'
                                    }}
                                />
                            </div>
                        )}
                    </AnimatePresence>

                    {/* ─ LOGO GROWS FROM ORB (after explosion) ─ */}
                    {animationStage >= 3 && (
                        <div style={{
                            position: 'absolute',
                            top: '35vh',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 12,
                            pointerEvents: 'none'
                        }}>
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{
                                    type: 'spring',
                                    damping: 14,
                                    stiffness: 90,
                                    mass: 0.6
                                }}
                                style={{
                                    width: '260px',
                                    height: '260px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative'
                                }}
                            >
                                {/* Outer orange halo - fiery pulsing */}
                                <div style={{
                                    position: 'absolute',
                                    width: '550px', height: '550px',
                                    left: '50%', top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(255,104,3,0.4) 0%, rgba(255,60,0,0.15) 40%, transparent 65%)',
                                    animation: isMobile ? 'orbPulse 2s ease-in-out infinite' : 'fieryGlowOuter 2s ease-in-out infinite'
                                }} />
                                {/* Bright inner white glow - fiery pulsing */}
                                <div style={{
                                    position: 'absolute',
                                    width: '320px', height: '320px',
                                    left: '50%', top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,220,160,0.5) 30%, rgba(255,140,50,0.2) 55%, transparent 70%)',
                                    animation: isMobile ? 'orbPulse 2s ease-in-out infinite' : 'fieryPulse 2s ease-in-out infinite'
                                }} />
                                {/* Fire ring around logo */}
                                <div style={{
                                    position: 'absolute',
                                    width: '280px', height: '280px',
                                    left: '50%', top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    borderRadius: '50%',
                                    border: '2px solid rgba(255,140,50,0.3)',
                                    boxShadow: isMobile ? 'none' : '0 0 30px 10px rgba(255,104,3,0.25), inset 0 0 30px 10px rgba(255,104,3,0.15)',
                                    animation: isMobile ? 'orbPulse 2.5s ease-in-out infinite 0.3s' : 'fieryGlowOuter 2.5s ease-in-out infinite 0.3s'
                                }} />
                                {/* The logo filled with WHITE + fiery breath */}
                                <div style={{
                                    width: '260px', height: '260px',
                                    position: 'relative', zIndex: 2,
                                    WebkitMaskImage: 'url(/dp.png)',
                                    maskImage: 'url(/dp.png)',
                                    WebkitMaskSize: 'contain',
                                    maskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center',
                                    maskPosition: 'center',
                                    background: '#FFFFFF',
                                    boxShadow: isMobile ? '0 0 20px 5px rgba(255,255,255,0.5), 0 0 40px 15px rgba(255,104,3,0.3)' : '0 0 40px 15px rgba(255,255,255,0.9), 0 0 80px 30px rgba(255,104,3,0.6)',
                                    animation: isMobile ? 'orbPulse 2s ease-in-out infinite' : 'logoBreath 2s ease-in-out infinite'
                                }} />
                            </motion.div>
                        </div>
                    )}

                    {/* ── HERO TEXT CONTENT ── */}
                    <div style={{ position: 'relative', zIndex: 10, marginTop: '45vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px' }}>
                        <motion.h1
                            className="landing-title"
                            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            style={{
                                fontSize: 'clamp(28px, 4.5vw, 48px)',
                                fontWeight: 400,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase' as const,
                                color: 'rgba(255, 255, 255, 0.85)',
                                maxWidth: '900px',
                                lineHeight: 1.2,
                                textAlign: 'center',
                                textShadow: '0 4px 20px rgba(0,0,0,0.8)'
                            }}
                        >
                            SIMPLIFYING DEVOPS CHAOS
                            <br />
                            FOR A SMARTER TOMORROW
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.p
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.7 }}
                            style={{
                                color: 'rgba(255,255,255,0.45)',
                                fontSize: '1rem', // slightly smaller, like Coinery
                                maxWidth: '600px', marginTop: '24px',
                                lineHeight: 1.6, fontWeight: 400,
                                textAlign: 'center',
                            }}
                        >
                            Join the future of DevOps with a secure, fast, and intuitive platform designed
                            <br />
                            for seamless incident response and team collaboration.
                        </motion.p>

                        {/* CTA buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.9 }}
                            style={{ display: 'flex', gap: '16px', marginTop: '36px', flexWrap: 'wrap', justifyContent: 'center' }}
                        >
                            <button
                                onClick={() => navigate('/login')}
                                style={{
                                    background: '#fff', color: '#0B0501', border: 'none',
                                    borderRadius: '10px', padding: '14px 34px',
                                    fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer',
                                    fontFamily: "'Satoshi', sans-serif",
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(255,255,255,0.15)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                Get Started <span style={{ fontSize: '1.2rem', marginLeft: '4px' }}>→</span>
                            </button>
                            <button
                                onClick={() => setIsChangelogOpen(true)}
                                style={{
                                    background: 'transparent', color: 'rgba(255,255,255,0.7)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '10px', padding: '14px 34px',
                                    fontWeight: 400, fontSize: '0.9rem', cursor: 'pointer',
                                    fontFamily: "'Satoshi', sans-serif",
                                    transition: 'all 0.2s',
                                    backdropFilter: 'blur(10px)',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
                            >
                                Contact Us
                            </button>
                        </motion.div>
                    </div>

                    {/* ─ BOTTOM CORNER CARDS (Coinery style stats cards) ─ */}
                    <motion.div
                        className="hero-stat-card"
                        initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 1.2 }}
                        style={{
                            position: 'absolute', bottom: '40px', left: '4vw',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '16px', padding: '16px 20px', width: '240px',
                            backdropFilter: 'blur(20px)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                            display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 10
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Server size={14} color="#rgba(255,255,255,0.7)" />
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff', letterSpacing: '0.05em' }}>SRV-01</span>
                            </div>
                            <ExternalLink size={14} color="rgba(255,255,255,0.3)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: 500, color: '#fff', letterSpacing: '0.02em' }}>99.99%</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                <span style={{ color: '#16F456', fontSize: '12px', fontWeight: 500 }}>↑ 0.02%</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>uptime</span>
                            </div>
                        </div>
                        {/* Fake mini graph */}
                        <div style={{ width: '100%', height: '30px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                            {[30, 40, 20, 50, 40, 60, 80, 70, 90, 85, 100].map((h, i) => (
                                <div key={i} style={{ flex: 1, backgroundColor: '#16F456', height: `${h}%`, opacity: 0.3 + (i * 0.06), borderRadius: '2px 2px 0 0' }} />
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        className="hero-stat-card"
                        initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 1.4 }}
                        style={{
                            position: 'absolute', bottom: '40px', right: '4vw',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '16px', padding: '16px 20px', width: '240px',
                            backdropFilter: 'blur(20px)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                            display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 10
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <SquareKanban size={14} color="#rgba(255,255,255,0.7)" />
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff', letterSpacing: '0.05em' }}>LATENCY</span>
                            </div>
                            <ExternalLink size={14} color="rgba(255,255,255,0.3)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: 500, color: '#fff', letterSpacing: '0.02em' }}>12ms</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                <span style={{ color: '#FF6803', fontSize: '12px', fontWeight: 500 }}>↓ 1.4ms</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>avg response</span>
                            </div>
                        </div>
                        {/* Fake mini graph */}
                        <div style={{ width: '100%', height: '30px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                            {[100, 80, 90, 60, 70, 50, 40, 30, 20, 15, 10].map((h, i) => (
                                <div key={i} style={{ flex: 1, backgroundColor: '#FF6803', height: `${h}%`, opacity: 0.3 + (i * 0.06), borderRadius: '2px 2px 0 0' }} />
                            ))}
                        </div>
                    </motion.div>

                </header>

                {/* ═══════════════ Timeline Content ═══════════════ */}
                <div className="landing-timeline-container">
                    {/* Timeline Rail */}
                    <div className="landing-timeline-rail">
                        <div style={{ position: 'absolute', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.04)' }}>
                            {!isMobile && (
                            <motion.div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: lineHeight,
                                background: 'linear-gradient(to bottom, transparent, #FF6803, #FEEBB8)',
                                boxShadow: '0 0 10px #FF6803, 0 0 20px #FEEBB8',
                            }} />
                            )}
                        </div>
                    </div>

                    {/* Sections */}
                    <div style={{ flex: 1, paddingBottom: '20vh', minWidth: 0 }}>

                        {/* 1: BCrypt Auth */}
                        <Section
                            icon={<Lock size={24} color="#16F456" />}
                            title="Impenetrable Authentication."
                            subtitle="Zero-knowledge security architecture"
                            text="Credentials are never stored in plaintext. BCrypt hashing with JWT access + refresh tokens secures every session. Spring Security guards endpoints with role-based authorization."
                            visual={<CodeBox title="SecurityConfig.java" color="#16F456" content={
                                <>
                                    <span style={{ color: '#FF6803' }}>@Bean</span><br />
                                    <span style={{ color: '#FF6803' }}>public</span> SecurityFilterChain <span style={{ color: '#FEEBB8' }}>filterChain</span>(HttpSecurity http) {'{'}<br />
                                    &nbsp;&nbsp;http.<span style={{ color: '#FEEBB8' }}>csrf</span>().disable()<br />
                                    &nbsp;&nbsp;&nbsp;&nbsp;.<span style={{ color: '#FEEBB8' }}>authorizeHttpRequests</span>(auth {'=> '} auth<br />
                                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.<span style={{ color: '#FEEBB8' }}>requestMatchers</span>(<span style={{ color: '#16F456' }}>"/auth/**"</span>).permitAll()<br />
                                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.anyRequest().authenticated()<br />
                                    &nbsp;&nbsp;&nbsp;&nbsp;)<br />
                                    &nbsp;&nbsp;&nbsp;&nbsp;.<span style={{ color: '#FEEBB8' }}>addFilterBefore</span>(jwtFilter, UsernamePasswordAuth...);<br />
                                    {'}'}
                                </>
                            } />}
                        />

                        {/* 2: WebSocket */}
                        <Section
                            icon={<Zap size={24} color="#FF6803" />}
                            title="Real-time WebSocket messaging."
                            subtitle="STOMP over SockJS"
                            text="Zero-latency incident room chat powered by Spring WebSocket. STOMP protocol enables instant bidirectional communication with automatic reconnection and message persistence."
                            visual={<CodeBox title="ChatController.java" color="#FF6803" content={
                                <>
                                    <span style={{ color: '#FEEBB8' }}>@MessageMapping</span>(<span style={{ color: '#16F456' }}>"/chat.sendMessage"</span>)<br />
                                    <span style={{ color: '#FF6803' }}>public void</span> <span style={{ color: '#FEEBB8' }}>sendMessage</span>(@Payload WsIncomingMessage msg,<br />
                                    &nbsp;&nbsp;&nbsp;&nbsp;Authentication auth) {'{'}<br />
                                    &nbsp;&nbsp;<span style={{ color: 'rgba(255,255,255,0.35)' }}>// Persist to PostgreSQL</span><br />
                                    &nbsp;&nbsp;messageRepository.<span style={{ color: '#FEEBB8' }}>save</span>(dbMessage);<br />
                                    &nbsp;&nbsp;<span style={{ color: 'rgba(255,255,255,0.35)' }}>// Broadcast via Redis pub/sub</span><br />
                                    &nbsp;&nbsp;redisPublisher.<span style={{ color: '#FEEBB8' }}>publish</span>(outgoingMessage);<br />
                                    {'}'}
                                </>
                            } />}
                        />

                        {/* 3: Redis */}
                        <Section
                            icon={<Database size={24} color="#FF4444" />}
                            title="Redis-powered presence tracking."
                            subtitle="Who's online, in real-time"
                            text="Every authenticated request updates a Redis key with a 5-minute TTL. Sub-millisecond lookups determine online/offline status and last-seen timestamps across all project members."
                            visual={<CodeBox title="UserActivityService.java" color="#FF4444" content={
                                <>
                                    <span style={{ color: '#FF6803' }}>public void</span> <span style={{ color: '#FEEBB8' }}>updateActivity</span>(UUID userId) {'{'}<br />
                                    &nbsp;&nbsp;String key = <span style={{ color: '#16F456' }}>"user:" + userId + ":lastSeen"</span>;<br />
                                    &nbsp;&nbsp;redisTemplate.opsForValue().<span style={{ color: '#FEEBB8' }}>set</span>(<br />
                                    &nbsp;&nbsp;&nbsp;&nbsp;key, Instant.now().toString(),<br />
                                    &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#FF6803' }}>Duration.ofMinutes(5)</span> <span style={{ color: 'rgba(255,255,255,0.35)' }}>// TTL</span><br />
                                    &nbsp;&nbsp;);<br />
                                    {'}'}
                                </>
                            } />}
                        />

                        {/* 3.5: CYAI Intelligence */}
                        <Section
                            icon={<Sparkles size={24} color="#FF6803" />}
                            title="CYAI: Our Flagship AI."
                            subtitle="DevOps & Security Copilot"
                            text="Unleash CYAI into your incident rooms. Our flagship AI analyzes timelines instantly, extrapolates root causes across services, generates comprehensive postmortems, and interacts interactively within team wars."
                            visual={<CodeBox title="AiService.java" color="#FF6803" content={
                                <>
                                    <span style={{ color: '#FEEBB8' }}>@Value</span>(<span style={{ color: '#16F456' }}>"${'{'}'ai.api.model:gemini-2.5-flash{'}'}"</span>)<br />
                                    <span style={{ color: '#FF6803' }}>private</span> String aiModel;<br />
                                    <br />
                                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>// Real-time integration into incident rooms</span><br />
                                    String summary = cyaiService.<span style={{ color: '#FEEBB8' }}>generateSummary</span>(roomId);<br />
                                    broadcastViaStompAndRedis(summary);
                                </>
                            } />}
                        />

                        {/* 4: Kanban Board */}
                        <Section
                            icon={<SquareKanban size={24} color="#FEEBB8" />}
                            title="Drag-and-drop Kanban boards."
                            subtitle="Visual project management"
                            text="Full-featured Kanban boards with 6-column workflow: TODO → On Hold → In Progress → In Review → QA → Done. Drag issues between columns with instant API-backed position sync."
                            visual={<CodeBox title="IssueController.java" color="#FEEBB8" content={
                                <>
                                    <span style={{ color: '#FEEBB8' }}>@PatchMapping</span>(<span style={{ color: '#16F456' }}>"/{'{'}id{'}'}/move"</span>)<br />
                                    <span style={{ color: '#FF6803' }}>public</span> ResponseEntity{'<'}Issue{'>'} <span style={{ color: '#FEEBB8' }}>moveIssue</span>(<br />
                                    &nbsp;&nbsp;@PathVariable Long id,<br />
                                    &nbsp;&nbsp;@RequestBody MoveRequest req) {'{'}<br />
                                    &nbsp;&nbsp;<span style={{ color: 'rgba(255,255,255,0.35)' }}>// Atomic status + position update</span><br />
                                    &nbsp;&nbsp;Issue issue = issueService.<span style={{ color: '#FEEBB8' }}>move</span>(id,<br />
                                    &nbsp;&nbsp;&nbsp;&nbsp;req.getStatus(), req.getPosition());<br />
                                    &nbsp;&nbsp;<span style={{ color: '#FF6803' }}>return</span> ResponseEntity.ok(issue);<br />
                                    {'}'}
                                </>
                            } />}
                        />

                        {/* 5: Invite System */}
                        <Section
                            icon={<Bell size={24} color="#FF6803" />}
                            title="Pending invitation system."
                            subtitle="SaaS-grade team management"
                            text="Admins dispatch invites to registered users. Members see pending invitations on their dashboard and can accept or decline — automatically joining the project on acceptance."
                            visual={<CodeBox title="InviteService.java" color="#FF6803" content={
                                <>
                                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>// Must be a registered user</span><br />
                                    User target = userRepository.<span style={{ color: '#FEEBB8' }}>findByEmail</span>(email)<br />
                                    &nbsp;&nbsp;.orElseThrow(() {'=> '} <span style={{ color: '#FF6803' }}>new</span> IllegalArgumentException(<br />
                                    &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#16F456' }}>"No such user exists."</span><br />
                                    &nbsp;&nbsp;));<br />
                                    <br />
                                    ProjectInvite invite = ProjectInvite.builder()<br />
                                    &nbsp;&nbsp;.project(project).email(email)<br />
                                    &nbsp;&nbsp;.status(<span style={{ color: '#FF6803' }}>PENDING</span>).build();
                                </>
                            } />}
                        />

                        {/* 6: RBAC */}
                        <Section
                            icon={<Shield size={24} color="#FF9A4D" />}
                            title="Role-based access control."
                            subtitle="ADMIN & MEMBER granularity"
                            text="Spring Security's @PreAuthorize annotations enforce strict role boundaries. Only ADMINs can create projects, send invites, and manage team composition. Members collaborate within assigned scopes."
                            visual={<CodeBox title="ProjectController.java" color="#FF9A4D" content={
                                <>
                                    <span style={{ color: '#FEEBB8' }}>@PostMapping</span><br />
                                    <span style={{ color: '#FEEBB8' }}>@PreAuthorize</span>(<span style={{ color: '#16F456' }}>"hasRole('ADMIN')"</span>)<br />
                                    <span style={{ color: '#FF6803' }}>public</span> ResponseEntity{'<'}Project{'>'} <span style={{ color: '#FEEBB8' }}>createProject</span>(<br />
                                    &nbsp;&nbsp;@RequestBody ProjectRequestDto request,<br />
                                    &nbsp;&nbsp;Authentication auth) {'{'}<br />
                                    &nbsp;&nbsp;<span style={{ color: '#FF6803' }}>return</span> ResponseEntity.ok(<br />
                                    &nbsp;&nbsp;&nbsp;&nbsp;projectService.<span style={{ color: '#FEEBB8' }}>createProject</span>(request, auth.getName())<br />
                                    &nbsp;&nbsp;);<br />
                                    {'}'}
                                </>
                            } />}
                        />

                        {/* 7: Flyway */}
                        <Section
                            icon={<Server size={24} color="#FEEBB8" />}
                            title="Flyway-managed schema evolution."
                            subtitle="Version-controlled database"
                            text="PostgreSQL schema changes are tracked through Flyway migrations. Every table creation and modification is versioned, repeatable, and auditable — never a manual ALTER TABLE again."
                            visual={<CodeBox title="V6__issue_activity.sql" color="#FEEBB8" content={
                                <>
                                    <span style={{ color: '#FF6803' }}>CREATE TABLE</span> issue_activities (<br />
                                    &nbsp;&nbsp;id <span style={{ color: '#FEEBB8' }}>BIGSERIAL PRIMARY KEY</span>,<br />
                                    &nbsp;&nbsp;issue_id <span style={{ color: '#FEEBB8' }}>BIGINT NOT NULL</span>,<br />
                                    &nbsp;&nbsp;user_email <span style={{ color: '#FEEBB8' }}>VARCHAR(255) NOT NULL</span>,<br />
                                    &nbsp;&nbsp;action <span style={{ color: '#FEEBB8' }}>VARCHAR(100) NOT NULL</span>,<br />
                                    &nbsp;&nbsp;created_at <span style={{ color: '#FEEBB8' }}>TIMESTAMP DEFAULT now()</span>,<br />
                                    &nbsp;&nbsp;<span style={{ color: '#FF6803' }}>CONSTRAINT</span> fk_activity_issue<br />
                                    &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#FF6803' }}>FOREIGN KEY</span> (issue_id) <span style={{ color: '#FF6803' }}>REFERENCES</span> issues(id)<br />
                                    );
                                </>
                            } />}
                        />
                    </div>
                </div>

                {/* ═══════════════ Footer ═══════════════ */}
                <div style={{ background: 'rgba(11,5,1,0.95)', padding: '60px 20px', display: 'flex', justifyContent: 'center', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ maxWidth: '1200px', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '40px' }}>
                        {/* Brand */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1.25rem', color: '#fff' }}>
                                <div style={{
                                    width: '160px', height: '70px',
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
                            <div style={{ color: 'rgba(255,255,255,0.30)', fontSize: '0.82rem', lineHeight: '1.8' }}>
                                © 2026 CyMOPS Inc.<br />
                                Real-time Incident Response Platform.
                            </div>
                        </div>

                        {/* Company */}
                        <div>
                            <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>Company</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <a href="mailto:cxat.app@gmail.com" className="landing-footer-link"><Mail size={14} /> Contact Us</a>
                                <a href="tel:+917528001623" className="landing-footer-link"><Phone size={14} /> +91 7528**1623</a>
                            </div>
                        </div>

                        {/* Resources */}
                        <div>
                            <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>Resources</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <a href="https://spring.io/projects/spring-boot" target="_blank" rel="noopener noreferrer" className="landing-footer-link">Spring Boot Reference</a>
                                <a href="https://react.dev/" target="_blank" rel="noopener noreferrer" className="landing-footer-link">React Documentation</a>
                                <a href="https://redis.io/docs/latest/" target="_blank" rel="noopener noreferrer" className="landing-footer-link">Redis Learn</a>
                                <a href="https://www.postgresql.org/docs/" target="_blank" rel="noopener noreferrer" className="landing-footer-link">PostgreSQL Docs</a>
                            </div>
                        </div>

                        {/* Legal */}
                        <div>
                            <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>Legal</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <span onClick={() => setShowTnc(true)} className="landing-footer-link">Terms & Conditions</span>
                                <span onClick={() => setShowPrivacy(true)} className="landing-footer-link">Privacy Policy</span>
                            </div>
                        </div>

                        {/* Socials */}
                        <div>
                            <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>Socials</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <a href="https://x.com/annkettt" target="_blank" rel="noopener noreferrer" className="landing-footer-link"><ExternalLink size={14} /> X (Twitter)</a>
                                <a href="https://www.instagram.com/anket.08/" target="_blank" rel="noopener noreferrer" className="landing-footer-link"><ExternalLink size={14} /> Instagram</a>
                                <a href="https://www.linkedin.com/in/anket-aeri-746347163/" target="_blank" rel="noopener noreferrer" className="landing-footer-link"><Globe size={14} /> LinkedIn</a>
                                <a href="https://leetcode.com/u/anket7/" target="_blank" rel="noopener noreferrer" className="landing-footer-link"><Code size={14} /> LeetCode</a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════════ Terms Modal ═══════════════ */}
                {showTnc && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,5,1,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }} onClick={() => setShowTnc(false)}>
                        <div style={{ background: 'rgba(11,5,1,0.95)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,104,3,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,104,3,0.2)' }}>
                                    <FileText size={32} color="#FF6803" />
                                </div>
                            </div>
                            <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '16px', fontWeight: 700 }}>Terms and Conditions</h2>
                            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: '1.7', marginBottom: '30px', fontWeight: 400 }}>
                                By using CyMOPS, you acknowledge that all incident data is persisted and <span style={{ color: '#fff' }}>managed at your own discretion</span>. We follow industry-standard security practices.
                            </p>
                            <button onClick={() => setShowTnc(false)} style={{ background: 'linear-gradient(135deg, #FF6803, #FF9A4D)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', width: '100%', fontFamily: "'Satoshi', sans-serif" }}>
                                I Understand
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════ Privacy Modal ═══════════════ */}
                {showPrivacy && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,5,1,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }} onClick={() => setShowPrivacy(false)}>
                        <div style={{ background: 'rgba(11,5,1,0.95)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px', marginTop: '16px' }}>
                                <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
                                    <defs><linearGradient id="hexGradP" x1="0" y1="0" x2="32" y2="32"><stop offset="0%" stopColor="#FF6803" /><stop offset="100%" stopColor="#FF9A4D" /></linearGradient></defs>
                                    <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" fill="url(#hexGradP)" />
                                </svg>
                            </div>
                            <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '16px', fontWeight: 700 }}>Privacy Policy</h2>
                            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.05rem', lineHeight: '1.7', marginBottom: '30px', fontWeight: 400 }}>
                                All <span style={{ color: '#fff' }}>passwords are BCrypt-hashed</span> before storage. Messages are persisted in PostgreSQL with audit trails. Redis keys auto-expire with configurable TTLs.
                            </p>
                            <button onClick={() => setShowPrivacy(false)} style={{ background: 'linear-gradient(135deg, #FF6803, #FF9A4D)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', width: '100%', fontFamily: "'Satoshi', sans-serif" }}>
                                Got it
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default LandingPage;