import React from 'react';
import { ProjectTask, User } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface ProjectTaskCardProps {
  task: ProjectTask;
  columnId: string;
  isBeingDragged: boolean;
  isPatron: boolean;
  allUsers: User[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void;
  onDeleteTask: (taskId: string, columnId: string) => void;
  onAssignTask: (taskId: string, assigneeId: string | undefined) => void;
}

const ProjectTaskCard: React.FC<ProjectTaskCardProps> = (props) => {
    const { 
        task, columnId, isBeingDragged, isPatron, allUsers, 
        onDragStart, onDeleteTask, onAssignTask
    } = props;

  const assignee = task.assigneeId ? allUsers.find(u => u.uid === task.assigneeId) : null;
  const approvedMembers = allUsers.filter(u => u.status === 'APPROVED');

  return (
    <div
      draggable={isPatron}
      onDragStart={isPatron ? (e) => onDragStart(e, task.id, columnId) : undefined}
      className={`bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 ${isPatron ? 'cursor-grab' : ''} ${isBeingDragged ? 'opacity-50 ring-2 ring-pink-500' : ''}`}
    >
      <p className="text-gray-800 dark:text-gray-200 mb-3">{task.content}</p>
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center min-w-0">
            {assignee ? (
                <>
                    <img
                        src={assignee.avatarUrl || `https://i.pravatar.cc/24?u=${assignee.username}`}
                        alt={assignee.name}
                        className="w-6 h-6 rounded-full mr-2 flex-shrink-0"
                        title={`Assigned to ${assignee.name}`}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate hidden sm:inline">{assignee.name}</span>
                </>
            ) : (
                <div className="flex items-center" title="Unassigned">
                    <div className="w-6 h-6 rounded-full mr-2 bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 italic hidden sm:inline">Unassigned</span>
                </div>
            )}
        </div>
        {isPatron && (
            <div className="flex items-center space-x-1 flex-shrink-0">
                 <select
                    value={task.assigneeId || ''}
                    onChange={(e) => onAssignTask(task.id, e.target.value ? e.target.value : undefined)}
                    className="text-xs border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
                 >
                    <option value="">Assign...</option>
                    {approvedMembers.map(user => (
                        <option key={user.uid} value={user.uid}>{user.name}</option>
                    ))}
                 </select>
                <button 
                    onClick={() => onDeleteTask(task.id, columnId)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" 
                    aria-label="Delete task"
                >
                    <TrashIcon />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ProjectTaskCard;
