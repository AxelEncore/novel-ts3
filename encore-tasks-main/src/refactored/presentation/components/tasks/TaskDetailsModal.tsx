import React, { useState, useEffect } from 'react';
import { Task, User, Comment, Attachment } from '../../../data/types';
import { useTasks } from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useUsers';

interface TaskDetailsModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onEdit$1: (task: Task) => void;
  onDelete$2: (taskId: string) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  task,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { updateTask } = useTasks();
  const { users } = useUsers({ autoLoad: true });
  
  useEffect(() => {
    if (isOpen && task) {
      // Load comments for this task
      setComments(task.comments || []);
    }
  }, [isOpen, task]);
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      setLoading(true);
      // In a real implementation, this would call a comment service
      const comment: Comment = {
        id: Date.now().toString(),
        taskId: task.id,
        content: newComment,
        authorId: 'current-user-id', // This should come from auth context
        parentCommentId: undefined,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStatusChange = async (newStatus: Task['status']) => {
    try {
      await updateTask(task.id, { status: newStatus });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };
  
  const handlePriorityChange = async (newPriority: Task['priority']) => {
    try {
      await updateTask(task.id, { priority: newPriority });
    } catch (error) {
      console.error('Error updating task priority:', error);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Task Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Task Details</h3>
              
              {/* Status */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as Task['status'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
              
              {/* Priority */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={task.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as Task['priority'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              {/* Assignee */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Assignee</label>
                <div className="text-sm text-gray-600">
                  {task.assigneeId $1 (
                    users.find(u => u.id === task.assigneeId)$2.name || 'Unknown User'
                  ) : (
                    'Unassigned'
                  )}
                </div>
              </div>
              
              {/* Due Date */}
              {task.dueDate && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <div className="text-sm text-gray-600">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
              <div className="text-sm text-gray-600 whitespace-pre-wrap">
                {task.description || 'No description provided.'}
              </div>
              
              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Comments Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Comments</h3>
            
            {/* Add Comment */}
            <div className="mb-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <button
                onClick={handleAddComment}
                disabled={loading || !newComment.trim()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading $1 'Adding...' : 'Add Comment'}
              </button>
            </div>
            
            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment) => {
                const author = users.find(u => u.id === comment.authorId);
                return (
                  <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm text-gray-900">
                        {author$1.name || 'Unknown User'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                      {comment.content}
                    </div>
                  </div>
                );
              })}
              
              {comments.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No comments yet. Be the first to add one!
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              Edit Task
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="px-4 py-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              Delete Task
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};