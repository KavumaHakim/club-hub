

import React, { useState } from 'react';
import { User, ProjectData, ProjectTask, TaskPriority } from '../types';
import * as api from '../services/apiService';
import ProjectColumn from './ProjectColumn';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { useData } from '../DataContext';
import EditTaskModal from './EditTaskModal';
import ConfirmationModal from './ConfirmationModal';
import { ViewGridIcon } from './icons/ViewGridIcon';
import { UsersIcon } from './icons/UsersIcon';
import AssignmentsView from './AssignmentsView';

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
  
  // View State
  const [viewMode, setViewMode] = useState<'board' | 'assignments'>('board');

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

  const handleSaveTask = async (taskData: { content: string, priority: TaskPriority, dueDate?: string, tags: string[], assigneeIds: string[] }) => {
    if (editingTask) {
        // Edit existing task
        await api.updateProjectTask(editingTask.id, taskData, { uid: currentUser.uid, name: currentUser.name });
    } else {
        // Create new task
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

  const handleToggleTaskAssignee = async (taskId: string, userId: string) => {
    if (!data) return;
    const task = data.tasks[taskId];
    if (!task) return;

    const currentAssignees = task.assigneeIds || [];
    const newAssignees = currentAssignees.includes(userId)
        ? currentAssignees.filter(id => id !== userId)
        : [...currentAssignees, userId];
    
    const oldData = JSON.parse(JSON.stringify(data));
    const newData = JSON.parse(JSON.stringify(data));
    newData.tasks[taskId].assigneeIds = newAssignees;
    setProjectData(newData);

    try {
        await api.updateTaskAssignees(taskId, newAssignees, { uid: currentUser.uid, name: currentUser.name });
    } catch (error: any) {
        console.error("Failed to assign task:", error);
        alert(`Could not update assignee: ${error.message}`);
        setProjectData(oldData);
    }
  };

  const handleSetTaskAssignee = async (taskId: string, newAssigneeId: string | null) => {
    if (!data) return;
    const task = data.tasks[taskId];
    if (!task) return;

    const newAssignees = newAssigneeId ? [newAssigneeId] : [];
    
    // Prevent update if there's no change
    if (JSON.stringify(task.assigneeIds.sort()) === JSON.stringify(newAssignees.sort())) return;

    const oldData = JSON.parse(JSON.stringify(data));
    const newData = JSON.parse(JSON.stringify(data));
    newData.tasks[taskId].assigneeIds = newAssignees;
    setProjectData(newData);

    try {
        await api.updateTaskAssignees(taskId, newAssignees, { uid: currentUser.uid, name: currentUser.name });
    } catch (error: any) {
        console.error("Failed to set task assignee:", error);
        alert(`Could not set assignee: ${error.message}`);
        setProjectData(oldData); // Revert on failure
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
      <div className="mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Club Projects</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{viewMode === 'board' ? 'Track tasks across workflow stages.' : 'Assign tasks to team members.'}</p>
        </div>
        <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl">
                <button
                    onClick={() => setViewMode('board')}
                    className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${viewMode === 'board' ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    title="Board View"
                >
                    <ViewGridIcon /> <span className="text-sm font-medium pr-2 hidden sm:inline">Board</span>
                </button>
                <button
                    onClick={() => setViewMode('assignments')}
                    className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${viewMode === 'assignments' ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    title="Assignments View"
                >
                    <UsersIcon /> <span className="text-sm font-medium pr-2 hidden sm:inline">Assignments</span>
                </button>
            </div>
            {currentUser.role === 'PATRON' && (
                 <button
                    onClick={handleOpenNewTaskModal}
                    className="flex items-center justify-center space-x-2 px-4 py-2.5 font-semibold text-white bg-pink-600 rounded-lg shadow-md hover:bg-pink-700 transition-all"
                  >
                    <PlusCircleIcon />
                    <span className="hidden sm:inline">New Task</span>
                  </button>
            )}
        </div>
      </div>
        {viewMode === 'board' ? (
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
                    onToggleTaskAssignee={handleToggleTaskAssignee}
                    onToggleTaskCompletion={handleToggleTaskCompletion}
                    onEditTask={handleOpenEditTaskModal}
                    />
                );
                })}
            </div>
        ) : (
            <AssignmentsView 
                data={data}
                allUsers={allUsers}
                currentUser={currentUser}
                onSetAssignee={handleSetTaskAssignee}
                onToggleTaskAssignee={handleToggleTaskAssignee}
                onEditTask={handleOpenEditTaskModal}
                onDeleteTask={handleDeleteTaskClick}
                onToggleTaskCompletion={handleToggleTaskCompletion}
            />
        )}


      <EditTaskModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentUser={currentUser}
        task={editingTask}
        onSave={handleSaveTask}
        allUsers={allUsers}
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