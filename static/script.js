/**
 * MyTodo -Task Manager
 */

class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.editingTaskId = null;
        this.storageKey = 'pinnacle-todo-tasks';
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.loadTasks();
        this.setupEventListeners();
        this.renderTasks();
        this.updateTaskCount();
        this.updateClearCompletedButton();
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Add task form
        const addTaskForm = document.getElementById('addTaskForm');
        const taskInput = document.getElementById('taskInput');

        addTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Clear completed button
        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        clearCompletedBtn.addEventListener('click', () => {
            this.clearCompletedTasks();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Task list event delegation
        const taskList = document.getElementById('taskList');
        taskList.addEventListener('click', (e) => {
            this.handleTaskListClick(e);
        });

        // Focus management for accessibility
        taskList.addEventListener('keydown', (e) => {
            this.handleTaskListKeydown(e);
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Escape key - cancel editing
        if (e.key === 'Escape' && this.editingTaskId !== null) {
            this.cancelEdit();
        }

        // Enter key in task input - add task
        if (e.key === 'Enter' && e.target.id === 'taskInput') {
            // Form submission will handle this
        }

        // Ctrl/Cmd + Enter - add task from anywhere
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.addTask();
        }
    }

    /**
     * Handle clicks on task list (event delegation)
     */
    handleTaskListClick(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;

        const taskId = parseInt(taskItem.dataset.taskId);
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Complete button
        if (e.target.closest('.complete-btn')) {
            this.toggleTaskComplete(taskId);
        }

        // Edit button
        if (e.target.closest('.edit-btn')) {
            this.startEdit(taskId);
        }

        // Delete button
        if (e.target.closest('.delete-btn')) {
            this.deleteTask(taskId);
        }
    }

    /**
     * Handle keyboard navigation in task list
     */
    handleTaskListKeydown(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;

        const taskId = parseInt(taskItem.dataset.taskId);
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                if (e.target.closest('.complete-btn')) {
                    this.toggleTaskComplete(taskId);
                } else if (e.target.closest('.edit-btn')) {
                    this.startEdit(taskId);
                } else if (e.target.closest('.delete-btn')) {
                    this.deleteTask(taskId);
                } else {
                    this.startEdit(taskId);
                }
                break;
            case ' ':
                e.preventDefault();
                this.toggleTaskComplete(taskId);
                break;
            case 'Delete':
            case 'Backspace':
                if (e.target.closest('.delete-btn')) {
                    e.preventDefault();
                    this.deleteTask(taskId);
                }
                break;
        }
    }

    /**
     * Add a new task
     */
    addTask() {
        const taskInput = document.getElementById('taskInput');
        const text = taskInput.value.trim();

        if (!text) {
            this.showNotification('Please enter a task', 'error');
            return;
        }

        const task = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.renderTasks();
        this.updateTaskCount();
        this.updateClearCompletedButton();

        // Clear input and focus
        taskInput.value = '';
        taskInput.focus();

        // Show success notification
        this.showNotification('Task added successfully!', 'success');

        // Add animation
        const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
        if (taskElement) {
            taskElement.style.animation = 'slideIn 0.3s ease-out';
        }
    }

    /**
     * Toggle task completion status
     */
    toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;

        this.saveTasks();
        this.renderTasks();
        this.updateTaskCount();
        this.updateClearCompletedButton();

        // Show notification
        const message = task.completed ? 'Task completed!' : 'Task marked as active';
        this.showNotification(message, 'success');
    }

    /**
     * Start editing a task
     */
    startEdit(taskId) {
        if (this.editingTaskId !== null) {
            this.cancelEdit();
        }

        this.editingTaskId = taskId;
        const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
        const taskText = taskItem.querySelector('.task-text');
        const editInput = taskItem.querySelector('.edit-input');
        const task = this.tasks.find(t => t.id === taskId);

        if (!task || !taskText || !editInput) return;

        // Hide text, show input
        taskText.style.display = 'none';
        editInput.style.display = 'block';
        editInput.value = task.text;
        editInput.focus();
        editInput.select();

        // Set up edit input event listeners
        const handleEditSubmit = (e) => {
            e.preventDefault();
            this.finishEdit(taskId);
        };

        const handleEditCancel = () => {
            this.cancelEdit();
        };

        editInput.addEventListener('submit', handleEditSubmit);
        editInput.addEventListener('blur', handleEditSubmit);
        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                handleEditCancel();
            }
        });

        // Store listeners for cleanup
        editInput._editListeners = { handleEditSubmit, handleEditCancel };
    }

    /**
     * Finish editing a task
     */
    finishEdit(taskId) {
        const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
        const editInput = taskItem?.querySelector('.edit-input');
        const taskText = taskItem?.querySelector('.task-text');
        const task = this.tasks.find(t => t.id === taskId);

        if (!task || !editInput || !taskText) return;

        const newText = editInput.value.trim();

        if (!newText) {
            this.showNotification('Task text cannot be empty', 'error');
            return;
        }

        if (newText === task.text) {
            this.cancelEdit();
            return;
        }

        task.text = newText;
        task.updatedAt = new Date().toISOString();

        this.saveTasks();
        this.renderTasks();
        this.editingTaskId = null;

        this.showNotification('Task updated successfully!', 'success');

        // Clean up event listeners
        if (editInput._editListeners) {
            editInput.removeEventListener('submit', editInput._editListeners.handleEditSubmit);
            editInput.removeEventListener('blur', editInput._editListeners.handleEditSubmit);
            delete editInput._editListeners;
        }
    }

    /**
     * Cancel editing a task
     */
    cancelEdit() {
        if (this.editingTaskId === null) return;

        const taskItem = document.querySelector(`[data-task-id="${this.editingTaskId}"]`);
        const editInput = taskItem?.querySelector('.edit-input');
        const taskText = taskItem?.querySelector('.task-text');

        if (editInput && taskText) {
            editInput.style.display = 'none';
            taskText.style.display = 'block';

            // Clean up event listeners
            if (editInput._editListeners) {
                editInput.removeEventListener('submit', editInput._editListeners.handleEditSubmit);
                editInput.removeEventListener('blur', editInput._editListeners.handleEditSubmit);
                delete editInput._editListeners;
            }
        }

        this.editingTaskId = null;
    }

    /**
     * Delete a task
     */
    deleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            // Add removal animation
            taskElement.classList.add('removing');
            
            setTimeout(() => {
                this.tasks = this.tasks.filter(t => t.id !== taskId);
                this.saveTasks();
                this.renderTasks();
                this.updateTaskCount();
                this.updateClearCompletedButton();
                this.showNotification('Task deleted successfully!', 'success');
            }, 300);
        } else {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.updateTaskCount();
            this.updateClearCompletedButton();
        }
    }

    /**
     * Clear all completed tasks
     */
    clearCompletedTasks() {
        const completedCount = this.tasks.filter(t => t.completed).length;
        
        if (completedCount === 0) return;

        this.tasks = this.tasks.filter(t => !t.completed);
        this.saveTasks();
        this.renderTasks();
        this.updateTaskCount();
        this.updateClearCompletedButton();

        this.showNotification(`${completedCount} completed task(s) cleared!`, 'success');
    }

    /**
     * Set the current filter
     */
    setFilter(filter) {
        this.currentFilter = filter;

        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });

        const activeTab = document.querySelector(`[data-filter="${filter}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.setAttribute('aria-selected', 'true');
        }

        this.renderTasks();
    }

    /**
     * Get filtered tasks based on current filter
     */
    getFilteredTasks() {
        switch (this.currentFilter) {
            case 'active':
                return this.tasks.filter(t => !t.completed);
            case 'completed':
                return this.tasks.filter(t => t.completed);
            default:
                return this.tasks;
        }
    }

    /**
     * Render all tasks
     */
    renderTasks() {
        const taskList = document.getElementById('taskList');
        const emptyState = document.getElementById('emptyState');
        const filteredTasks = this.getFilteredTasks();

        // Clear current tasks
        taskList.innerHTML = '';

        if (filteredTasks.length === 0) {
            // Show empty state
            taskList.style.display = 'none';
            emptyState.style.display = 'block';
            
            // Update empty state message based on filter
            const emptyStateTitle = emptyState.querySelector('h3');
            const emptyStateText = emptyState.querySelector('p');
            
            if (this.currentFilter === 'active') {
                emptyStateTitle.textContent = 'No active tasks';
                emptyStateText.textContent = 'All tasks are completed!';
            } else if (this.currentFilter === 'completed') {
                emptyStateTitle.textContent = 'No completed tasks';
                emptyStateText.textContent = 'Complete some tasks to see them here!';
            } else {
                emptyStateTitle.textContent = 'No tasks yet';
                emptyStateText.textContent = 'Add a task above to get started!';
            }
        } else {
            // Hide empty state
            taskList.style.display = 'block';
            emptyState.style.display = 'none';

            // Render tasks
            filteredTasks.forEach(task => {
                const taskElement = this.createTaskElement(task);
                taskList.appendChild(taskElement);
            });
        }
    }

    /**
     * Create a task element
     */
    createTaskElement(task) {
        const template = document.getElementById('taskTemplate');
        const taskElement = template.content.cloneNode(true);
        const li = taskElement.querySelector('.task-item');
        const taskText = taskElement.querySelector('.task-text');
        const completeBtn = taskElement.querySelector('.complete-btn');
        const editInput = taskElement.querySelector('.edit-input');

        // Set task data
        li.dataset.taskId = task.id;
        taskText.textContent = task.text;

        // Set completion state
        if (task.completed) {
            li.classList.add('completed');
            completeBtn.querySelector('i').className = 'fas fa-check';
        }

        // Set editing state
        if (this.editingTaskId === task.id) {
            taskText.style.display = 'none';
            editInput.style.display = 'block';
            editInput.value = task.text;
            editInput.focus();
            editInput.select();
        }

        return taskElement;
    }

    /**
     * Update task count display
     */
    updateTaskCount() {
        const activeTasks = this.tasks.filter(t => !t.completed).length;
        const taskCountElement = document.getElementById('taskCount');
        
        if (activeTasks === 1) {
            taskCountElement.textContent = '1 task remaining';
        } else {
            taskCountElement.textContent = `${activeTasks} tasks remaining`;
        }
    }

    /**
     * Update clear completed button visibility
     */
    updateClearCompletedButton() {
        const completedTasks = this.tasks.filter(t => t.completed).length;
        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        
        if (completedTasks > 0) {
            clearCompletedBtn.style.display = 'block';
        } else {
            clearCompletedBtn.style.display = 'none';
        }
    }

    /**
     * Save tasks to localStorage
     */
    saveTasks() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Failed to save tasks:', error);
            this.showNotification('Failed to save tasks', 'error');
        }
    }

    /**
     * Load tasks from localStorage
     */
    loadTasks() {
        try {
            const savedTasks = localStorage.getItem(this.storageKey);
            if (savedTasks) {
                this.tasks = JSON.parse(savedTasks);
            }
        } catch (error) {
            console.error('Failed to load tasks:', error);
            this.showNotification('Failed to load saved tasks', 'error');
            this.tasks = [];
        }
    }

    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease-out',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#6366f1'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});

// Service Worker for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
} 