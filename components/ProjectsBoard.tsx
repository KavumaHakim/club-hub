

import React, { useState } from 'react';
import { User, ProjectData, ProjectTask, TaskPriority } from '../types';
import * as api from '../services/apiService';
import ProjectColumn from './ProjectColumn';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { useData } from '../DataContext';
import EditTaskModal from './EditTaskModal';
import ConfirmationModal from './ConfirmationModal';

interface ProjectsBoardProps {
  currentUser: User;
}

const ProjectsBoard: React.FC<ProjectsBoardProps> = ({ currentUser }) => {
  const { 
    projectData: data, 
    setProjectData,
    allUsers, 
    isLoadingProjects, 
    isLoadingUsers, 
    projectDataError,
    allUsersError,
    fetchProjectData 
  } = useData();

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [sourceColumnId, setSourceColumnId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{columnId: string; index: number} | null>(null);
  
  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | undefined>(undefined);
  
  // Delete Confirmation State
  const [taskToDelete, setTaskToDelete] = useState<{taskId: string, columnId: string} | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string, colId: string) => {
    if (currentUser.role !== 'PATRON') return;
    setDraggedItemId(taskId);
    setSourceColumnId(colId);
  };
  
  const handleDrop = async (destinationColumnId: string) => {
    if (!dropIndicator || !draggedItemId || !sourceColumnId || !data) return;
    
    const currentDraggedItemId = draggedItemId;
    const currentSourceColumnId = sourceColumnId;
    const newIndex = dropIndicator.index;
    
    setDraggedItemId(null);
    setSourceColumnId(null);
    setDropIndicator(null);
    
    const originalIndex = data.columns[currentSourceColumnId].taskIds.indexOf(currentDraggedItemId);
    if (currentSourceColumnId === destinationColumnId && originalIndex === newIndex) {
        return;
    }

    const oldData = data;
    const newData: ProjectData = JSON.parse(JSON.stringify(data));
    const sourceCol = newData.columns[currentSourceColumnId];
    const destCol = newData.columns[destinationColumnId];

    const [movedTask] = sourceCol.taskIds.splice(originalIndex, 1);
    destCol.taskIds.splice(newIndex, 0, movedTask);
    
    // Optimistically update the task's columnId
    newData.tasks[currentDraggedItemId].columnId = destinationColumnId;

    setProjectData(newData);

    if (currentSourceColumnId !== destinationColumnId) {
        try {
            await api.moveProjectTask(currentDraggedItemId, destinationColumnId);
        } catch (error: any) {
            console.error("Failed to move task:", error);
            alert(`An error occurred while moving the task. Reverting changes.`);
            setProjectData(oldData); 
        }
    }
  };

  const handleOpenNewTaskModal = () => {
      setEditingTask(undefined);
      setIsEditModalOpen(true);
  };

  const handleOpenEditTaskModal = (task: ProjectTask) => {
      setEditingTask(task);
      setIsEditModalOpen(true);
  };

  const handleSaveTask = async (taskData: { content: string, priority: TaskPriority, dueDate?: string, tags: string[] }) => {
    if (editingTask) {
        // Edit existing
        await api.updateProjectTask(editingTask.id, taskData);
    } else {
        // Create new - Find first column to add to
        const firstColumnId = data?.columnOrder[0];
        if (firstColumnId) {
             await api.addProjectTask(taskData, currentUser.uid, firstColumnId);
        } else {
            alert("No columns available to add tasks.");
        }
    }
    await fetchProjectData();
  };

  const handleDeleteTaskClick = (taskId: string, columnId: string) => {
      setTaskToDelete({ taskId, columnId });
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
        await api.deleteProjectTask(taskToDelete.taskId, taskToDelete.columnId);
        await fetchProjectData();
    } catch (error: any) {
        console.error("Failed to delete task:", error);
        alert(`Could not delete the task: ${error.message}`);
    } finally {
        setTaskToDelete(null);
    }
  };

  const handleAssignTask = async (taskId: string, userId: string) => {
    if (!data) return;
    
    // Optimistic update
    const task = data.tasks[taskId];
    if (!task) return;

    const currentAssignee = task.assigneeId;
    const newAssignee = currentAssignee === userId ? null : userId;

    const newData = JSON.parse(JSON.stringify(data));
    newData.tasks[taskId].assigneeId = newAssignee;
    setProjectData(newData);

    try {
        await api.updateTaskAssignee(taskId, newAssignee);
    } catch (error: any) {
        console.error("Failed to assign task:", error);
        alert(`Could not update assignee: ${error.message}`);
        await fetchProjectData(); // Revert
    }
  };

  const handleToggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    if (data) {
        const newData = JSON.parse(JSON.stringify(data));
        if (newData.tasks[taskId]) {
            newData.tasks[taskId].isCompleted = !currentStatus;
            setProjectData(newData);
        }
    }
    try {
        await api.toggleProjectTaskCompletion(taskId, !currentStatus, currentUser.uid);
    } catch (error: any) {
        console.error("Failed to toggle task:", error);
        await fetchProjectData();
    }
  };

  if (isLoadingProjects || isLoadingUsers) {
    return <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading project board...</div>;
  }
  
  if (projectDataError || allUsersError) {
    return <div className="text-center p-8 text-red-500 dark:text-red-400">{`Could not load project data: ${projectDataError || allUsersError}`}</div>;
  }
  
  if (!data) {
    return <div className="text-center p-8 text-gray-500 dark:text-gray-400">No project data found.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Club Projects Board</h2>
        {currentUser.role === 'PATRON' && (
             <button
                onClick={handleOpenNewTaskModal}
                className="flex items-center justify-center space-x-2 px-5 py-2 font-semibold text-white bg-pink-600 rounded-lg shadow-md hover:bg-pink-700 transition-all"
              >
                <PlusCircleIcon />
                <span>New Task</span>
              </button>
        )}
      </div>

      <div className="flex-1 flex space-x-4 overflow-x-auto pb-4 custom-scrollbar">
        {data.columnOrder.map(columnId => {
          const column = data.columns[columnId];
          const tasks = (column.taskIds || []).map(taskId => data.tasks[taskId]).filter(Boolean);
          return (
            <ProjectColumn
              key={column.id}
              column={column}
              tasks={tasks}
              allUsers={allUsers}
              isPatron={currentUser.role === 'PATRON'}
              currentUser={currentUser}
              draggedItemId={draggedItemId}
              dropIndicator={dropIndicator}
              setDropIndicator={setDropIndicator}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDeleteTask={handleDeleteTaskClick}
              onToggleTaskAssignee={handleAssignTask}
              onToggleTaskCompletion={handleToggleTaskCompletion}
              // Pass the edit handler down
              onEditTask={handleOpenEditTaskModal}
            />
          );
        })}
      </div>

      {/* Reused Modal for Create and Edit */}
      <EditTaskModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentUser={currentUser}
        task={editingTask}
        onSave={handleSaveTask}
      />

      <ConfirmationModal 
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={confirmDeleteTask}
        title="Delete Task"
        message="Are you sure you want to delete this task? This cannot be undone."
        confirmText="Delete"
        isDangerous
      />
    </div>
  );
};

export default ProjectsBoard;