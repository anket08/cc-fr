import React, { useState } from 'react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    MeasuringStrategy,
    useSensor,
    useSensors,
    closestCorners,
    useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import IssueCard from './IssueCard';
import type { IssueData } from './IssueCard';
import api from '../api/axios';

const COLUMNS: { id: IssueData['status']; label: string; color: string }[] = [
    { id: 'TODO',        label: 'To Do',       color: 'var(--text-tertiary)' },
    { id: 'ON_HOLD',     label: 'On Hold',     color: '#a855f7' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'var(--accent)' },
    { id: 'IN_REVIEW',   label: 'In Review',   color: 'var(--warning)' },
    { id: 'QA',          label: 'QA',          color: '#06b6d4' },
    { id: 'DONE',        label: 'Done',        color: 'var(--success)' },
];

// ── Sortable issue card wrapper ─────────────────────────────────────────────
function SortableCard({ issue, onOpen }: { issue: IssueData; onOpen: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <IssueCard issue={issue} onClick={onOpen} dragging={isDragging} />
        </div>
    );
}

// ── Droppable column ────────────────────────────────────────────────────────
function KanbanColumn({
    col, issues, onOpen, onAdd,
}: {
    col: typeof COLUMNS[0];
    issues: IssueData[];
    onOpen: (issue: IssueData) => void;
    onAdd: () => void;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: col.id });

    return (
        <div className={`kanban-column col-accent-${col.id}${isOver ? ' drag-over' : ''}`}>
            <div className="kanban-column-header">
                <div className="kanban-column-title">
                    <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: col.color,
                    }} />
                    {col.label}
                    <span className="kanban-column-count">{issues.length}</span>
                </div>
                <button
                    className="btn-ghost"
                    style={{ padding: '3px 5px', fontSize: '0.8rem' }}
                    onClick={onAdd}
                    title={`Add issue to ${col.label}`}
                >
                    <Plus size={14} />
                </button>
            </div>
            <div className="kanban-column-body" ref={setNodeRef}>
                <SortableContext items={issues.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {issues.map(issue => (
                        <SortableCard key={issue.id} issue={issue} onOpen={() => onOpen(issue)} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}

// ── Main KanbanBoard ────────────────────────────────────────────────────────
interface Props {
    issues: IssueData[];
    onIssueClick: (issue: IssueData) => void;
    onAddToColumn: (status: string) => void;
    onRefresh: () => void;
}

const KanbanBoard: React.FC<Props> = ({ issues, onIssueClick, onAddToColumn, onRefresh }) => {
    const [activeIssue, setActiveIssue] = useState<IssueData | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const columnIssues = (status: IssueData['status']) =>
        issues.filter(i => i.status === status).sort((a, b) => a.position - b.position);

    function findColumn(issueId: number): IssueData['status'] | null {
        for (const col of COLUMNS) {
            if (columnIssues(col.id).some(i => i.id === issueId)) return col.id;
        }
        return null;
    }

    const handleDragStart = (event: DragStartEvent) => {
        const id = Number(event.active.id);
        setActiveIssue(issues.find(i => i.id === id) || null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveIssue(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = Number(active.id);
        const overId = over.id;

        // Determine target column
        const targetStatus = COLUMNS.find(c => c.id === overId)?.id
            ?? findColumn(Number(overId))
            ?? null;

        if (!targetStatus) return;

        const sourceStatus = findColumn(activeId);
        if (!sourceStatus) return;

        const targetColumn = columnIssues(targetStatus);

        // Calculate new position
        let newPosition: number;
        if (typeof overId === 'string' && COLUMNS.some(c => c.id === overId)) {
            // Dropped onto column header / empty space
            newPosition = targetColumn.length;
        } else {
            const overIdx = targetColumn.findIndex(i => i.id === Number(overId));
            newPosition = overIdx >= 0 ? overIdx : targetColumn.length;
        }

        try {
            await api.patch(`/issues/${activeId}/move`, {
                status: targetStatus,
                position: newPosition,
            });
            onRefresh();
        } catch (e) {
            console.error('Failed to move issue');
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            measuring={{
                droppable: { strategy: MeasuringStrategy.Always },
            }}
            modifiers={[restrictToWindowEdges]}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="kanban-board">
                {COLUMNS.map(col => (
                    <KanbanColumn
                        key={col.id}
                        col={col}
                        issues={columnIssues(col.id)}
                        onOpen={onIssueClick}
                        onAdd={() => onAddToColumn(col.id)}
                    />
                ))}
            </div>

            {/* Drag overlay — snaps to cursor, restricted to viewport */}
            <DragOverlay dropAnimation={null}>
                {activeIssue && (
                    <div style={{
                        opacity: 0.92,
                        transform: 'rotate(1.5deg) scale(1.02)',
                        cursor: 'grabbing',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                        borderRadius: 'var(--radius-md)',
                        width: '268px',
                    }}>
                        <IssueCard issue={activeIssue} onClick={() => {}} dragging={false} />
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
};

export default KanbanBoard;
