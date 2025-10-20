import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, User, Bell, CheckCircle, Circle, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { apiClient } from '../services/api';

const TasksTab = ({ client, userRole }) => {
  const [tasks, setTasks] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, completed, overdue
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignee: '',
    dueDate: '',
    priority: 'medium',
    reminder: false
  });

  useEffect(() => {
    if (client) {
      loadTasks();
    }
  }, [client]);

  const loadTasks = async () => {
    try {
      const tasksData = await apiClient.getTasks(client.id);
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !client) return;

    try {
      const taskData = {
        ...newTask,
        clientId: client.id,
        status: 'pending'
      };
      const createdTask = await apiClient.createTask(taskData);
      setTasks(prev => [createdTask, ...prev]);
      setNewTask({
        title: '',
        description: '',
        assignee: '',
        dueDate: '',
        priority: 'medium',
        reminder: false
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await apiClient.updateTask(taskId, updates);
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      ));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await apiClient.deleteTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const toggleTaskStatus = (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    handleUpdateTask(task.id, { status: newStatus });
  };

  const filteredTasks = tasks.filter(task => {
    switch (filter) {
      case 'pending':
        return task.status === 'pending';
      case 'completed':
        return task.status === 'completed';
      case 'overdue':
        return task.status === 'pending' && new Date(task.dueDate) < new Date();
      default:
        return true;
    }
  });

  const mockTasks = [
    {
      id: 'task-1',
      title: 'Prepare project proposal draft',
      description: 'Create comprehensive proposal for Phase 1 implementation',
      assignee: 'John Smith',
      dueDate: '2024-01-20',
      priority: 'high',
      status: 'pending',
      reminder: true,
      createdAt: '2024-01-15'
    },
    {
      id: 'task-2',
      title: 'Review technical requirements',
      description: 'Go through technical specifications and identify potential challenges',
      assignee: 'Sarah Johnson',
      dueDate: '2024-01-18',
      priority: 'medium',
      status: 'completed',
      reminder: false,
      createdAt: '2024-01-14'
    },
    {
      id: 'task-3',
      title: 'Schedule follow-up meeting',
      description: 'Arrange demo session with stakeholders',
      assignee: 'Mike Chen',
      dueDate: '2024-01-25',
      priority: 'low',
      status: 'pending',
      reminder: true,
      createdAt: '2024-01-16'
    }
  ];

  const displayTasks = tasks.length > 0 ? filteredTasks : mockTasks.filter(task =>
    filter === 'all' || (filter === 'pending' && task.status === 'pending') ||
    (filter === 'completed' && task.status === 'completed')
  );

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const isOverdue = (task) => {
    return task.status === 'pending' && new Date(task.dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Task Controls */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Task Management</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Task
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          {['all', 'pending', 'completed', 'overdue'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                filter === filterOption
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Create/Edit Task Form */}
      {(showCreateForm || editingTask) && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingTask ? 'Edit Task' : 'Create New Task'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                value={editingTask ? editingTask.title : newTask.title}
                onChange={(e) => editingTask
                  ? setEditingTask({...editingTask, title: e.target.value})
                  : setNewTask({...newTask, title: e.target.value})
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter task title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={editingTask ? editingTask.description : newTask.description}
                onChange={(e) => editingTask
                  ? setEditingTask({...editingTask, description: e.target.value})
                  : setNewTask({...newTask, description: e.target.value})
                }
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter task description"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignee
                </label>
                <input
                  type="text"
                  value={editingTask ? editingTask.assignee : newTask.assignee}
                  onChange={(e) => editingTask
                    ? setEditingTask({...editingTask, assignee: e.target.value})
                    : setNewTask({...newTask, assignee: e.target.value})
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Assign to..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={editingTask ? editingTask.dueDate : newTask.dueDate}
                  onChange={(e) => editingTask
                    ? setEditingTask({...editingTask, dueDate: e.target.value})
                    : setNewTask({...newTask, dueDate: e.target.value})
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={editingTask ? editingTask.priority : newTask.priority}
                  onChange={(e) => editingTask
                    ? setEditingTask({...editingTask, priority: e.target.value})
                    : setNewTask({...newTask, priority: e.target.value})
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={editingTask ? editingTask.reminder : newTask.reminder}
                onChange={(e) => editingTask
                  ? setEditingTask({...editingTask, reminder: e.target.checked})
                  : setNewTask({...newTask, reminder: e.target.checked})
                }
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label className="text-sm text-gray-700">Set reminder</label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingTask(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingTask ? () => handleUpdateTask(editingTask.id, editingTask) : handleCreateTask}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Tasks {filter !== 'all' && `(${filter})`}
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {displayTasks.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No tasks found</p>
            </div>
          ) : (
            displayTasks.map((task) => (
              <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <button
                      onClick={() => toggleTaskStatus(task)}
                      className="mt-1 flex-shrink-0"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className={`text-base font-medium ${
                          task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}>
                          {task.title}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {isOverdue(task) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-red-600 bg-red-100">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overdue
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}

                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {task.assignee && (
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{task.assignee}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {task.reminder && (
                          <div className="flex items-center space-x-1">
                            <Bell className="h-4 w-4" />
                            <span>Reminder set</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setEditingTask(task)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksTab;