

import React, { useState, useMemo } from 'react';
import { ProjectData, ProjectTask, User } from '../types';
import ProjectTaskCard from './ProjectTaskCard';

interface AssignmentsViewProps {
    data: ProjectData;
    allUsers: User[];
    currentUser: User;
    onSetAssignee: (taskId: string, newAssigneeId: string | null) => void;
    onToggleTaskAssignee: (taskId: string, userId: string) => void; // For card dropdown
    onEditTask: (task: ProjectTask) => void;
    onDeleteTask: (taskId: string, columnId: string) => void;
    onToggleTaskCompletion: (taskId: string, currentStatus: boolean) => void;
    onSubmitTaskFile: (taskId: string, file: File) => Promise<void>;
    onDeleteSubmission: (taskId: string, userId: string, filePath: string) => Promise<void>;
}


const AssignmentsView: React.FC<AssignmentsViewProps> = (props) => {
    const { data, allUsers, currentUser, onSetAssignee } = props;
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [overZoneId, setOverZoneId] = useState<string | null>(null); // user uid or 'unassigned'

    const { unassignedTasks, assignedTasks } = useMemo(() => {
        const unassigned: ProjectTask[] = [];
        const assigned: Record<string, ProjectTask[]> = {};

        Object.values(data.tasks).forEach((task: ProjectTask) => {
            if (task.assigneeIds && task.assigneeIds.length > 0) {
                task.assigneeIds.forEach(assigneeId => {
                    if (!assigned[assigneeId]) {
                        assigned[assigneeId] = [];
                    }
                    assigned[assigneeId].push(task);
                });
            } else {
                unassigned.push(task);
            }
        });
        return { unassignedTasks: unassigned, assignedTasks: assigned };
    }, [data.tasks]);

    const membersToDisplay = useMemo(() => {
        const approved = allUsers.filter(u => u.status === 'APPROVED');
        if (currentUser.role === 'PATRON') {
            return approved;
        }
        // For members, only show their own column
        return approved.filter(u => u.uid === currentUser.uid);
    }, [allUsers, currentUser]);


    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string, columnId: string) => {
        if (currentUser.role !== 'PATRON') return;
        setDraggedTaskId(taskId);
    };

    const handleDrop = (newAssigneeId: string | null) => {
        if (draggedTaskId) {
            onSetAssignee(draggedTaskId, newAssigneeId);
        }
        setDraggedTaskId(null);
    };
    
    return (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar p-1">
            {/* Unassigned Column */}
            <div 
                onDragOver={(e) => { e.preventDefault(); setOverZoneId('unassigned'); }}
                onDragLeave={() => setOverZoneId(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(null); setOverZoneId(null); }}
                className={`p-4 transition-colors border-2 ${overZoneId === 'unassigned' ? 'border-ch-accent bg-ch-accent-soft border-dashed' : 'border-transparent'} bg-ch-surface h-fit`}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-ch-surface-2 flex items-center justify-center text-lg">?</div>
                    <div>
                        <h3 className="font-bold text-ch-text">Unassigned Tasks</h3>
                        <p className="text-sm text-ch-muted">{unassignedTasks.length} task(s)</p>
                    </div>
                </div>
                <div className="space-y-3 min-h-[100px]">
                    {unassignedTasks.map(task => (
                        <ProjectTaskCard 
                            key={task.id}
                            task={task}
                            columnId={task.columnId}
                            isBeingDragged={draggedTaskId === task.id}
                            isPatron={currentUser.role === 'PATRON'}
                            currentUser={currentUser}
                            allUsers={allUsers}
                            onDragStart={handleDragStart}
                            onDeleteTask={props.onDeleteTask}
                            onToggleTaskAssignee={props.onToggleTaskAssignee}
                            onToggleTaskCompletion={props.onToggleTaskCompletion}
                            onEditTask={props.onEditTask}
                            onSubmitTaskFile={props.onSubmitTaskFile}
                            onDeleteSubmission={props.onDeleteSubmission}
                        />
                    ))}
                    {unassignedTasks.length === 0 && <div className="h-24"></div>}
                </div>
            </div>
            
            {/* Assigned Columns */}
            {membersToDisplay.map(member => (
                <div
                    key={member.uid}
                    onDragOver={(e) => { e.preventDefault(); setOverZoneId(member.uid); }}
                    onDragLeave={() => setOverZoneId(null)}
                    onDrop={(e) => { e.preventDefault(); handleDrop(member.uid); setOverZoneId(null); }}
                    className={`p-4 transition-colors border-2 ${overZoneId === member.uid ? 'border-ch-accent bg-ch-accent-soft border-dashed' : 'border-transparent'} bg-ch-surface h-fit`}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <img src={member.avatarUrl || `https://i.pravatar.cc/40?u=${member.username}`} alt={member.name} className="w-10 h-10" />
                        <div>
                            <h3 className="font-bold text-ch-text">{member.name}</h3>
                            <p className="text-sm text-ch-muted">{(assignedTasks[member.uid] || []).length} task(s)</p>
                        </div>
                    </div>
                    <div className="space-y-3 min-h-[100px]">
                        {(assignedTasks[member.uid] || []).map(task => (
                            <ProjectTaskCard
                                key={task.id}
                                task={task}
                                columnId={task.columnId}
                                isBeingDragged={draggedTaskId === task.id}
                                isPatron={currentUser.role === 'PATRON'}
                                currentUser={currentUser}
                                allUsers={allUsers}
                                onDragStart={handleDragStart}
                                onDeleteTask={props.onDeleteTask}
                                onToggleTaskAssignee={props.onToggleTaskAssignee}
                                onToggleTaskCompletion={props.onToggleTaskCompletion}
                                onEditTask={props.onEditTask}
                                onSubmitTaskFile={props.onSubmitTaskFile}
                                onDeleteSubmission={props.onDeleteSubmission}
                                submissionOwner={member}
                            />
                        ))}
                         {(assignedTasks[member.uid] || []).length === 0 && <div className="h-24"></div>}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AssignmentsView;