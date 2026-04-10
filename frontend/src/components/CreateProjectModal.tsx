import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import api from '../api/axios';

interface Props {
    onCreated: () => void;
    onClose: () => void;
}

const CreateProjectModal: React.FC<Props> = ({ onCreated, onClose }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        setError(null);
        try {
            await api.post('/projects', { name: name.trim() });
            onCreated();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Only ADMINs can create projects.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-box animate-entrance" style={{ maxWidth: '440px', padding: '0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="icon-container icon-blue" style={{ margin: 0, width: '32px', height: '32px' }}>
                            <FolderPlus size={18} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Create New Project</h3>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: '6px' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ padding: '28px 24px' }}>
                        <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Projects help you organize incidents, tasks, and team members. Give your workspace a clear name.
                        </p>

                        {error && (
                            <div style={{ 
                                background: 'var(--danger-subtle)', 
                                color: 'var(--danger)', 
                                padding: '10px 14px', 
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.85rem',
                                marginBottom: '16px',
                                border: '1px solid var(--danger)',
                                fontWeight: 500
                            }}>
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="drawer-field-label" style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Project Name</label>
                            <input
                                className="input-modern"
                                placeholder="e.g. Infrastructure Security"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                autoFocus
                                style={{ fontSize: '1rem', padding: '12px 14px' }}
                            />
                        </div>
                    </div>

                    <div className="modal-footer" style={{ borderTop: '1px solid var(--border-default)', padding: '16px 24px', background: 'var(--bg-root)' }}>
                        <button type="button" onClick={onClose} className="btn-pill-dark">Cancel</button>
                        <button type="submit" className="btn-pill" disabled={loading || !name.trim()} style={{ minWidth: '130px' }}>
                            {loading ? 'Creating...' : 'Launch Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProjectModal;

