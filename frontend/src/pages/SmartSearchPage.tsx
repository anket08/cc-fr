import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Search, Hash, Zap, Command, FolderKanban, CheckSquare, Bug, BookOpen } from 'lucide-react';

const TypeIcons: any = { TASK: <CheckSquare size={16}/>, BUG: <Bug size={16}/>, STORY: <BookOpen size={16}/>, EPIC: <Zap size={16}/> };

const SmartSearchPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const q = searchParams.get('q') || '';
    const navigate = useNavigate();

    const [searchInput, setSearchInput] = useState(q);
    const [incidentResults, setIncidentResults] = useState<any[]>([]);
    const [projectResults, setProjectResults] = useState<any[]>([]);
    const [issueResults, setIssueResults] = useState<any[]>([]);
    const [aiSummaries, setAiSummaries] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        setSearchInput(q);
        if (!q) {
            setIncidentResults([]);
            setProjectResults([]);
            setIssueResults([]);
            setHasSearched(false);
            return;
        }
        
        const fetchSearch = async () => {
            setIsLoading(true);
            setHasSearched(true);
            try {
                // 1. Search Incidents via backend search endpoint
                const incRes = await api.get(`/rooms/search?q=${encodeURIComponent(q)}`);
                setIncidentResults(incRes.data);
                
                // Fetch AI summaries for top 2 incident results
                incRes.data.slice(0, 2).forEach(async (r: any) => {
                    try {
                        const aiRes = await api.get(`/api/ai/rooms/${r.id}/summary`);
                        setAiSummaries(prev => ({ ...prev, [r.id]: aiRes.data.summary }));
                    } catch (e) {}
                });

                // 2. Fetch all user projects to filter client-side
                const projRes = await api.get('/projects');
                const allProjects = projRes.data;
                const matchedProjects = allProjects.filter((p: any) => p.name.toLowerCase().includes(q.toLowerCase()));
                setProjectResults(matchedProjects);

                // 3. Fetch all issues from all user projects to filter client-side
                const issuePromises = allProjects.map((p: any) => api.get(`/issues?projectId=${p.id}`));
                const issueResponses = await Promise.all(issuePromises);
                const allIssues = issueResponses.flatMap(res => res.data);
                const matchedIssues = allIssues.filter(i => 
                    i.title.toLowerCase().includes(q.toLowerCase()) || 
                    (i.description && i.description.toLowerCase().includes(q.toLowerCase()))
                );
                setIssueResults(matchedIssues);

            } catch (e) {
                console.error("Search failed", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSearch();
    }, [q]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchInput.trim()) setSearchParams({ q: searchInput.trim() });
        else setSearchParams({});
    };

    const totalResults = incidentResults.length + projectResults.length + issueResults.length;

    return (
        <div className="animate-entrance" style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 0' }}>
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <Command color="var(--accent)" size={32} /> Smart Search
                </h1>
                
                <form onSubmit={handleSearch} style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
                    <Search color="var(--text-tertiary)" size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                        type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                        placeholder="Search incidents, projects, issues..."
                        className="input-modern"
                        style={{ width: '100%', padding: '16px 20px 16px 48px', fontSize: '1.1rem', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-main)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        autoFocus
                    />
                    <button type="submit" className="btn-pill" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '8px 16px' }}>
                        Search
                    </button>
                </form>
            </div>

            {isLoading ? (
                <div style={{ padding: '60px', textAlign: 'center' }}><div className="loader" style={{ margin: '0 auto' }}></div></div>
            ) : hasSearched && totalResults === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-subtle)', background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)' }}>
                    <Search size={32} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                    <p style={{ margin: 0, fontSize: '1.1rem' }}>No results found for "{q}"</p>
                </div>
            ) : hasSearched ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Projects Section */}
                    {projectResults.length > 0 && (
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 12px', color: 'var(--text-secondary)' }}>Projects ({projectResults.length})</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {projectResults.map(p => (
                                    <div key={p.id} className="modern-card" style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => navigate(`/projects/${p.id}`)}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FolderKanban size={18} color="var(--accent)" />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{p.name}</h3>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-subtle)' }}>ID: #{p.id}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Incidents Section */}
                    {incidentResults.length > 0 && (
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 12px', color: 'var(--text-secondary)' }}>Incidents ({incidentResults.length})</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {incidentResults.map((r, i) => (
                                    <div key={r.id} className="modern-card" style={{ padding: '20px', cursor: 'pointer', borderLeft: '4px solid var(--warning)' }} onClick={() => navigate(`/rooms/${r.id}`)}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Hash size={18} color="#ef4444" />
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{r.name}</h3>
                                                    <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Project #{r.project?.id || '?'}</p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px', background: r.severity === 'SEV1' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)', color: r.severity === 'SEV1' ? '#fca5a5' : '#93c5fd', fontWeight: 700 }}>{r.severity || 'SEV3'}</span>
                                            </div>
                                        </div>
                                        {i < 2 && aiSummaries[r.id] && (
                                            <div style={{ marginTop: '12px', background: 'rgba(168, 85, 247, 0.05)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                                                <h4 style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={12} /> AI Summary</h4>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', opacity: 0.9 }}>{aiSummaries[r.id]}</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tickets Section */}
                    {issueResults.length > 0 && (
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 12px', color: 'var(--text-secondary)' }}>Tickets ({issueResults.length})</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {issueResults.map(i => (
                                    <div key={i.id} className="modern-card" style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => navigate('/issues')}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {TypeIcons[i.type] || <CheckSquare size={16} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{i.title}</h3>
                                            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Project #{i.projectId} · Status: {i.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
};

export default SmartSearchPage;
