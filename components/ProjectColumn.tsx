import React from 'react';
import { ProjectColumn, ProjectTask, User } from '../types';
import ProjectTaskCard from './ProjectTaskCard';

interface ProjectColumnProps {
  column: ProjectColumn;
  tasks: ProjectTask[];
  allUsers: User[];
  isPatron: boolean;
  draggedItemId: string | null;
  dragOverColumnId: string | null;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter: (columnId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, destinationColumnId: string) => void;
  onDeleteTask: (taskId: string, columnId: string) => void;
  // FIX: Changed assigneeId from number | undefined to string | undefined to match the type in ProjectTask and the event handler.
  onAssignTask: (taskId: string, assigneeId: string | undefined) => void;
}

const ProjectColumn: React.FC<ProjectColumnProps> = (props) => {
  const { 
    column, tasks, allUsers, isPatron, draggedItemId, dragOverColumnId,
    onDragStart, onDragOver, onDrop, onDeleteTask, onAssignTask, onDragEnter, onDragLeave
  } = props;

  const isDropTarget = isPatron && dragOverColumnId === column.id && draggedItemId !== null;

  return (
    <div
      onDragOver={isPatron ? onDragOver : undefined}
      onDrop={isPatron ? (e) => onDrop(e, column.id) : undefined}
      onDragEnter={isPatron ? () => onDragEnter(column.id) : undefined}
      onDragLeave={isPatron ? onDragLeave : undefined}
      className={`bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4 md:w-80 flex-shrink-0 border border-gray-200 dark:border-gray-700 transition-colors duration-200 ${isDropTarget ? 'bg-gray-200 dark:bg-gray-700/80' : ''}`}
    >
      <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">{column.title} ({tasks.length})</h3>
      <div className="space-y-3 min-h-[200px]">
        {tasks.map((task) => (
          <ProjectTaskCard
            key={task.id}
            task={task}
            columnId={column.id}
            isBeingDragged={draggedItemId === task.id}
            isPatron={isPatron}
            allUsers={allUsers}
            onDragStart={onDragStart}
            onDeleteTask={onDeleteTask}
            onAssignTask={onAssignTask}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectColumn;