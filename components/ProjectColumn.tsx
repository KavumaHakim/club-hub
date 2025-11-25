

import React from 'react';
import { ProjectColumn as ProjectColumnType, ProjectTask, User } from '../types';
import ProjectTaskCard from './ProjectTaskCard';
import DropIndicator from './DropIndicator';

interface ProjectColumnProps {
  column: ProjectColumnType;
  tasks: ProjectTask[];
  allUsers: User[];
  isPatron: boolean;
  currentUser: User;
  draggedItemId: string | null;
  dropIndicator: { columnId: string; index: number } | null;
  setDropIndicator: (indicator: { columnId: string; index: number } | null) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void;
  onDrop: (destinationColumnId: string) => void;
  onDeleteTask: (taskId: string, columnId: string) => void;
  onToggleTaskAssignee: (taskId: string, userId: string) => void;
  onToggleTaskCompletion: (taskId: string, currentStatus: boolean) => void;
  onEditTask: (task: ProjectTask) => void;
  onSubmitTaskFile: (taskId: string, file: File) => Promise<void>;
  onDeleteSubmission: (taskId: string, filePath: string) => Promise<void>;
}

const getDragAfterElement = (container: HTMLElement, y: number) => {
    const draggableElements = [...container.querySelectorAll('[data-task-id]:not([data-dragging="true"])')] as HTMLElement[];

    return draggableElements.reduce<{ offset: number; element: HTMLElement | undefined }>((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY, element: undefined }).element;
};


const ProjectColumn: React.FC<ProjectColumnProps> = (props) => {
  const { 
    column, tasks, allUsers, isPatron, currentUser, draggedItemId, dropIndicator, setDropIndicator,
    onDragStart, onDrop, onDeleteTask, onToggleTaskAssignee, onToggleTaskCompletion, onEditTask,
    onSubmitTaskFile, onDeleteSubmission
  } = props;
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isPatron || !draggedItemId) return;
    
    const afterElement = getDragAfterElement(e.currentTarget, e.clientY);
    const newIndex = afterElement 
        ? tasks.findIndex(t => t.id === afterElement.dataset.taskId) 
        : tasks.length;

    setDropIndicator({ columnId: column.id, index: newIndex });
  };

  const handleDragLeave = () => {
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isPatron) return;
    onDrop(column.id);
  };

  return (
    <div
      className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4 w-80 flex-shrink-0 border border-gray-200 dark:border-gray-700 h-full flex flex-col"
    >
      <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex-shrink-0">{column.title} ({tasks.length})</h3>
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="space-y-3 flex-1 overflow-y-auto min-h-[100px] transition-colors custom-scrollbar"
      >
        {tasks.length === 0 && <DropIndicator visible={!!dropIndicator && dropIndicator.columnId === column.id} />}
        {tasks.map((task, index) => (
            <React.Fragment key={task.id}>
                <DropIndicator visible={!!dropIndicator && dropIndicator.columnId === column.id && dropIndicator.index === index} />
                <ProjectTaskCard
                    task={task}
                    columnId={column.id}
                    isBeingDragged={draggedItemId === task.id}
                    isPatron={isPatron}
                    currentUser={currentUser}
                    allUsers={allUsers}
                    onDragStart={onDragStart}
                    onDeleteTask={onDeleteTask}
                    onToggleTaskAssignee={onToggleTaskAssignee}
                    onToggleTaskCompletion={onToggleTaskCompletion}
                    onEditTask={onEditTask}
                    onSubmitTaskFile={onSubmitTaskFile}
                    onDeleteSubmission={onDeleteSubmission}
                />
            </React.Fragment>
        ))}
        <DropIndicator visible={!!dropIndicator && dropIndicator.columnId === column.id && dropIndicator.index === tasks.length} />
      </div>
    </div>
  );
};

export default ProjectColumn;