import React, { useState } from 'react';
import { User } from '../types';
import * as api from '../services/apiService';
import ProjectColumn from './ProjectColumn';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { useData } from '../DataContext';

interface ProjectsBoardProps {
  currentUser: User;
}

const ProjectsBoard: React.FC<ProjectsBoardProps> = ({ currentUser }) => {
  const { 
    projectData: data, 
    allUsers, 
    isLoadingProjects, 
    isLoadingUsers, 
    fetchProjectData 
  } = useData();

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [newTaskContent, setNewTaskContent] = useState('');

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => {
    if (currentUser.role !== 'PATRON') return;
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('sourceColumnId', sourceColumnId);
    setDraggedItemId(taskId);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
  };
  
  const handleDragEnter = (columnId: string) => {
    if (draggedItemId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumnId(null);
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, destinationColumnId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    setDraggedItemId(null);
    if (currentUser.role !== 'PATRON' || !data) return;

    const taskId = e.dataTransfer.getData('taskId');
    const sourceColumnId = e.dataTransfer.getData('sourceColumnId');
    if (!taskId || sourceColumnId === destinationColumnId) return;
    
    try {
      await api.moveProjectTask(taskId, destinationColumnId);
      await fetchProjectData(); // Refetch from context
    } catch (error) {
      console.error("Failed to move task:", error);
      alert("An error occurred while moving the task. Please try again.");
    }
  };

  const handleAddTask = async () => {
    if (!newTaskContent.trim() || !data) return;
    try {
      await api.addProjectTask(newTaskContent);
      setNewTaskContent('');
      await fetchProjectData();
    } catch (error) {
      console.error("Failed to add task:", error);
      alert("An error occurred while adding the task. Please try again.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
        await api.deleteProjectTask(taskId);
        await fetchProjectData();
    } catch (error) {
        console.error("Failed to delete task:", error);
        alert("Could not delete the task. Please try again.");
    }
  };

  const handleAssignTask = async (taskId: string, assigneeId: string | undefined) => {
    try {
        await api.assignProjectTask(taskId, assigneeId);
        await fetchProjectData();
    } catch (error) {
        console.error("Failed to assign task:", error);
        alert("Could not assign the task. Please try again.");
    }
  };

  if (isLoadingProjects || isLoadingUsers) {
    return <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading project board...</div>;
  }
  
  if (!data) {
    return <div className="text-center p-8 text-red-500 dark:text-red-400">Could not load project data.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Club Projects Board</h2>
      
      {currentUser.role === 'PATRON' && (
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
            placeholder="Enter new task content..."
            className="flex-grow w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          />
          <button
            onClick={handleAddTask}
            disabled={!newTaskContent.trim()}
            className="flex items-center justify-center space-x-2 px-5 py-3 font-semibold text-white bg-pink-600 rounded-lg shadow-md hover:bg-pink-700 disabled:opacity-50 transition-all"
          >
            <PlusCircleIcon />
            <span>Add Task</span>
          </button>
        </div>
      )}

      <div className="flex-1 flex space-x-4 overflow-x-auto pb-4">
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
              draggedItemId={draggedItemId}
              dragOverColumnId={dragOverColumnId}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDeleteTask={handleDeleteTask}
              onAssignTask={handleAssignTask}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ProjectsBoard;