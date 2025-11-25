

import React, { memo, useState, useEffect, useRef } from 'react';
import { ProjectTask, User } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { CheckIcon } from './icons/CheckIcon';
import { PencilIcon } from './icons/PencilIcon';
import { UserAddIcon } from './icons/UserAddIcon';

interface ProjectTaskCardProps {
  task: ProjectTask;
  columnId: string;
  isBeingDragged: boolean;
  isPatron: boolean;
  currentUser: User;
  allUsers: User[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void;
  onDeleteTask: (taskId: string, columnId: string) => void;
  onToggleTaskAssignee: (taskId: string, userId: string) => void;
  onToggleTaskCompletion: (taskId: string, currentStatus: boolean) => void;
  onEditTask: (task: ProjectTask) => void;
}

const DRAGGING_CLASSES = ['opacity-75', 'ring-2', 'ring-pink-500', 'rotate-3', 'scale-105', 'shadow-2xl'];

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
    let colorClass = "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    if (priority === 'HIGH') colorClass = "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
    if (priority === 'MEDIUM') colorClass = "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
    if (priority === 'LOW') colorClass = "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";

    return (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${colorClass}`}>
            {priority}
        </span>
    );
};

const ProjectTaskCard: React.FC<ProjectTaskCardProps> = (props) => {
    const { 
        task, columnId, isBeingDragged, isPatron, currentUser, allUsers, 
        onDragStart, onDeleteTask, onToggleTaskAssignee, onToggleTaskCompletion, onEditTask
    } = props;

  const [isAssignDropdownOpen, setIsAssignDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Resolve single assignee object from ID
  const assignee = task.assigneeId ? allUsers.find(u => u.uid === task.assigneeId) : null;
  const approvedMembers = allUsers.filter(u => u.status === 'APPROVED');
  const isCompleted = task.isCompleted;

  // Determine if due date is passed
  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() && !isCompleted : false;

  // Allow completion toggling if user is a Patron OR is the assignee
  const canToggleCompletion = isPatron || (task.assigneeId === currentUser.uid);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsAssignDropdownOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleAssignee = (e: React.MouseEvent, userId: string) => {
      e.stopPropagation();
      onToggleTaskAssignee(task.id, userId);
      setIsAssignDropdownOpen(false);
  };

  return (
    <div
      draggable={isPatron}
      onDragStart={isPatron ? (e) => {
        DRAGGING_CLASSES.forEach(c => e.currentTarget.classList.add(c));
        onDragStart(e, task.id, columnId);
      } : undefined}
      onDragEnd={isPatron ? (e) => {
        DRAGGING_CLASSES.forEach(c => e.currentTarget.classList.remove(c));
      } : undefined}
      onClick={() => isPatron && onEditTask(task)} // Click to edit
      data-task-id={task.id}
      data-dragging={isBeingDragged}
      className={`bg-white dark:bg-gray-800 p-4 rounded-md border transform transition-all duration-300 shadow-sm relative group ${
          isPatron ? 'cursor-grab hover:border-pink-300 dark:hover:border-pink-700' : ''
      } ${
          isBeingDragged ? 'opacity-40' : ''
      } ${
          isCompleted 
            ? 'border-green-200 dark:border-green-900/50 bg-green-50/40 dark:bg-green-900/20' 
            : 'border-gray-200 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {/* Priority & Edit Hint */}
      <div className="flex justify-between items-center mb-2">
          <PriorityBadge priority={task.priority} />
          {isPatron && <PencilIcon className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>

      <div className="flex items-start gap-3">
          <button 
             onClick={(e) => {
                 e.stopPropagation();
                 canToggleCompletion && onToggleTaskCompletion(task.id, !!isCompleted);
             }}
             disabled={!canToggleCompletion}
             className={`relative flex-shrink-0 mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ease-out ${
                 isCompleted 
                 ? 'bg-green-500 border-green-500 text-white' 
                 : 'bg-transparent border-gray-300 dark:border-gray-600 text-transparent hover:border-green-400 dark:hover:border-green-400'
             } ${!canToggleCompletion ? 'cursor-default opacity-60' : 'cursor-pointer active:scale-90'}`}
          >
              <div className={`transform transition-all duration-300 ease-in-out ${isCompleted ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`}>
                <CheckIcon />
              </div>
          </button>
          <p className={`text-gray-800 dark:text-gray-200 mb-1 flex-grow text-sm font-medium transition-all duration-300 ${isCompleted ? 'line-through text-gray-500 dark:text-gray-500 opacity-75' : ''}`}>
              {task.content}
          </p>
      </div>

      {/* Metadata Row: Due Date & Tags */}
      {(task.dueDate || (task.tags && task.tags.length > 0)) && (
          <div className="mt-2 pl-9 flex flex-wrap gap-2 transition-opacity duration-300" style={{ opacity: isCompleted ? 0.6 : 1 }}>
              {task.dueDate && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isOverdue ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400' : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400'}`}>
                      📅 {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
              )}
              {task.tags?.map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                      #{tag}
                  </span>
              ))}
          </div>
      )}

      <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between relative">
        <div className="flex items-center min-w-0" onClick={e => e.stopPropagation()}>
            {assignee ? (
                <div className="flex items-center gap-2">
                    <img
                        src={assignee.avatarUrl || `https://i.pravatar.cc/24?u=${assignee.username}`}
                        alt={assignee.name}
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 object-cover"
                        title={assignee.name}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[80px]">{assignee.name}</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 opacity-50">
                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50" title="Unassigned">
                       <span className="text-[10px] text-gray-400">?</span>
                    </div>
                    <span className="text-xs text-gray-400">Unassigned</span>
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {isPatron && (
                <div className="relative" ref={dropdownRef}>
                    <button 
                        onClick={() => setIsAssignDropdownOpen(!isAssignDropdownOpen)}
                        className={`p-1.5 rounded-full transition-colors ${isAssignDropdownOpen ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300' : 'text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}
                        aria-label="Manage assignee"
                        title="Assign Member"
                    >
                        <UserAddIcon className="h-4 w-4" />
                    </button>

                    {isAssignDropdownOpen && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-60 overflow-y-auto custom-scrollbar">
                            <div className="p-2 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Assign to...
                            </div>
                            {approvedMembers.map(user => {
                                const isAssigned = task.assigneeId === user.uid;
                                return (
                                    <div 
                                        key={user.uid}
                                        onClick={(e) => toggleAssignee(e, user.uid)}
                                        className={`px-3 py-2 flex items-center gap-2 text-sm cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${isAssigned ? 'bg-pink-50 dark:bg-pink-900/10' : ''}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${isAssigned ? 'bg-pink-500 border-pink-500' : 'border-gray-300 dark:border-gray-500'}`}>
                                            {isAssigned && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                        </div>
                                        <img src={user.avatarUrl || `https://i.pravatar.cc/20?u=${user.username}`} className="w-5 h-5 rounded-full object-cover" alt="" />
                                        <span className={`truncate ${isAssigned ? 'text-pink-700 dark:text-pink-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {user.name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            
            {isPatron && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask(task.id, columnId);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" 
                    aria-label="Delete task"
                >
                    <TrashIcon className="h-4 w-4" />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default memo(ProjectTaskCard);