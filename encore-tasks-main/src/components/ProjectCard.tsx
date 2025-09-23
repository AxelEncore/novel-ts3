import React, { useState } from 'react';
import { ProjectWithStats } from '../types/core.types';
import { Users, Calendar, MoreVertical, Archive, Settings, Eye, MessageSquare } from 'lucide-react';

interface ProjectCardProps {
  project: ProjectWithStats;
  viewMode?: 'grid' | 'list';
  onClick: () => void;
  onEdit?: (project: ProjectWithStats) => void;
  currentUserId?: string;
  isAdmin?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  viewMode = 'grid',
  onClick, 
  onEdit,
  currentUserId,
  isAdmin = false
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onEdit) {
      onEdit(project);
    }
  };

  const canEdit = isAdmin || project.created_by === currentUserId;

  if (viewMode === 'list') {
    return (
      <div 
      className={`bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 relative ${
        project.archived ? 'opacity-75 bg-gray-50' : ''
      }`}
        style={{ borderLeftColor: project.color }}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">{project.icon}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-gray-600 mt-1 truncate">{project.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>{project.members_count || 0} участников</span>
                <span>{project.boards_count || 0} досок</span>
                <span>{project.tasks_count || 0} задач</span>
                <span>Создан {formatDate(project.created_at)}</span>
                {project.telegram_chat_id && (
                  <div className="flex items-center space-x-1 text-blue-600">
                    <MessageSquare size={12} />
                    <span>Telegram</span>
                  </div>
                )}
                {project.archived && (
                  <div className="flex items-center space-x-1 text-orange-600">
                    <Archive size={12} />
                    <span>Архивирован</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {canEdit && (
            <div className="relative">
              <button 
                className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                disabled={isLoading}
              >
                <MoreVertical size={20} />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                  <div className="py-1">
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onClick();
                      }}
                    >
                      <Eye size={16} />
                      <span>Открыть</span>
                    </button>
                    
                    {canEdit && (
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        onClick={handleEditClick}
                      >
                        <Settings size={16} />
                        <span>Настройки</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 relative ${
        project.archived ? 'opacity-75 bg-gray-50' : ''
      }`}
      style={{ borderLeftColor: project.color }}
      onClick={onClick}
    >
      {project.archived && (
        <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs px-2 py-1 rounded">
          Архив
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className="text-2xl">{project.icon}</span>
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: project.color }}
            ></div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
            )}
          </div>
        </div>
        
        {canEdit && (
          <div className="relative">
            <button 
              className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
              onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            >
              <MoreVertical size={20} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                <div className="py-1">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onClick();
                    }}
                  >
                    <Eye size={16} />
                    <span>Открыть</span>
                  </button>
                  
                  {canEdit && (
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      onClick={handleEditClick}
                    >
                      <Settings size={16} />
                      <span>Настройки</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Users size={16} />
            <span>{project.members_count || 0} участников</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar size={16} />
            <span>{formatDate(project.created_at)}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 text-xs">
          {project.boards_count !== undefined && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {project.boards_count} досок
            </span>
          )}
          {project.tasks_count !== undefined && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
              {project.tasks_count} задач
            </span>
          )}
        </div>
      </div>
      
      {/* Telegram интеграция */}
      {(project.telegram_chat_id || project.telegram_topic_id) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <MessageSquare size={14} />
            <span>Telegram интеграция настроена</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCard;