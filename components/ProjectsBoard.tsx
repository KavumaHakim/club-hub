import React, { useState, useEffect, useCallback } from 'react';
import { ProjectData, User, ProjectTask } from '../types';
import * as api from '../services/apiService';
import ProjectColumn from './ProjectColumn';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

interface ProjectsBoardProps {
  currentUser: User;
}

const ProjectsBoard: React.FC<ProjectsBoardProps> = ({ currentUser }) => {
  const [data, setData] = useState<ProjectData | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projectData, users] = await Promise.all([api.getProjectData(), api.getUsers()]);
      setData(projectData);
      setAllUsers(users);
    } catch (error) {
      console.error("Failed to load project board data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    if (currentUser.role !== 'PATRON' || !data) return;

    const taskId = e.dataTransfer.getData('taskId');
    const sourceColumnId = e.dataTransfer.getData('sourceColumnId');
    setDraggedItemId(null);

    if (!taskId || !sourceColumnId || sourceColumnId === destinationColumnId) {
      return;
    }

    const sourceColumn = data.columns[sourceColumnId];
    const destColumn = data.columns[destinationColumnId];
    
    // Optimistic UI update
    const sourceTaskIds = sourceColumn.taskIds.filter(id => id !== taskId);
    // To place the task at the end of the new column
    const destTaskIds = [...destColumn.taskIds, taskId];
    
    const newData = {
      ...data,
      columns: {
        ...data.columns,
        [sourceColumnId]: { ...sourceColumn, taskIds: sourceTaskIds },
        [destinationColumnId]: { ...destColumn, taskIds: destTaskIds },
      },
    };
    setData(newData);
    
    try {
        await api.moveProjectTask(taskId, destinationColumnId);
    } catch (error) {
        console.error("Failed to move task", error);
        setData(data); // Revert on failure
    }
  };
  
  const handleAddTask = async (taskContent: string) => {
    try {
        await api.addProjectTask(taskContent);
        await fetchData(); // Refetch to get the updated data
    } catch (error) {
        console.error("Failed to add task", error);
    }
  };
  
  const handleDeleteTask = async (taskId: string, columnId: string) => {
    if (!data) return;
    const originalData = { ...data };
    
    // Optimistic UI Update
    const newTasks = { ...data.tasks };
    delete newTasks[taskId];
    const column = data.columns[columnId];
    const newTaskIds = column.taskIds.filter(id => id !== taskId);

    const newData = {
        ...data,
        tasks: newTasks,
        columns: { ...data.columns, [columnId]: { ...column, taskIds: newTaskIds }},
    };
    setData(newData);

    try {
        await api.deleteProjectTask(taskId);
    } catch (error) {
        console.error("Failed to delete task", error);
        setData(originalData); // Revert on fail
    }
  };
  
  const handleAssignTask = async (taskId: string, assigneeId: string | undefined) => {
    if (!data) return;
    const originalData = { ...data };
    
    // Optimistic UI Update
    const updatedTask = { ...data.tasks[taskId], assigneeId };
    const newData = { ...data, tasks: { ...data.tasks, [taskId]: updatedTask } };
    setData(newData);
    
    try {
        await api.assignProjectTask(taskId, assigneeId);
    } catch (error) {
        console.error("Failed to assign task", error);
        setData(originalData); // Revert on fail
    }
  };

  if (isLoading || !data) {
      return <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading projects board...</div>;
  }

  return (
    <div>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Projects Board</h2>
        {currentUser.role === 'PATRON' && <AddTaskForm onAddTask={handleAddTask} />}
        <div className="flex flex-col md:flex-row md:space-x-4 overflow-x-auto pb-4">
        {data.columnOrder.map(columnId => {
            const column = data.columns[columnId];
            const tasks = column.taskIds.map(taskId => data.tasks[taskId]).filter(Boolean); // Filter out undefined tasks
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


const AddTaskForm: React.FC<{onAddTask: (content: string) => void}> = ({ onAddTask }) => {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setIsSubmitting(true);
        await onAddTask(content);
        setContent('');
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <PlusCircleIcon />
            <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add a new task to the backlog..."
                className="flex-grow p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 font-semibold text-white bg-pink-600 rounded-lg shadow-sm hover:bg-pink-700 disabled:opacity-50">
                {isSubmitting ? 'Adding...' : 'Add Task'}
            </button>
        </form>
    );
}

export default ProjectsBoard;