import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Calendar, Users, List, Eye, EyeOff, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EditBoardModal } from './EditBoardModal';

interface Board {
  id: string;
  name: string;
  description: string;
  visibility: 'public' | 'private';
  project_id: string;
  project_name: string;
  creator_id: string;
  creator_username: string;
  created_at: string;
  updated_at: string;
  columns_count: number;
  tasks_count: number;
}

interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface BoardCardProps {
  board: Board;
  currentUser: User;
  projects: Project[];
  viewMode?: 'grid' | 'list';
  onBoardUpdated?: (board: Board) => void;
  onBoardDeleted?: (boardId: string) => void;
}

export function BoardCard({
  board,
  currentUser,
  projects,
  viewMode = 'grid',
  onBoardUpdated,
  onBoardDeleted
}: BoardCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = currentUser.role === 'admin' || currentUser.id === board.creator_id;
  const canDelete = currentUser.role === 'admin' || currentUser.id === board.creator_id;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при удалении доски');
        return;
      }

      toast.success('Доска успешно удалена');
      if (onBoardDeleted) {
        onBoardDeleted(board.id);
      }
    } catch (error) {
      console.error('Error deleting board:', error);
      toast.error('Ошибка при удалении доски');
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleBoardUpdated = (updatedBoard: Board) => {
    if (onBoardUpdated) {
      onBoardUpdated(updatedBoard);
    }
    setShowEditModal(false);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || board.project_name || 'Неизвестный проект';
  };

  if (viewMode === 'list') {
    return (
      <>
        <div className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              {board.name.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">{board.name}</h3>
              <p className="text-gray-400 text-sm truncate">{board.description || 'Нет описания'}</p>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-xs text-gray-500">{getProjectName(board.project_id)}</span>
                <div className="flex items-center space-x-1">
                  <List className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-500">{board.columns_count || 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-500">{board.tasks_count || 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={board.visibility === 'private' ? 'secondary' : 'default'}>
              {board.visibility === 'private' ? (
                <>
                  <EyeOff className="w-3 h-3 mr-1" />
                  Приватная
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3 mr-1" />
                  Публичная
                </>
              )}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                {canEdit && (
                  <DropdownMenuItem 
                    onClick={handleEdit}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Редактировать
                  </DropdownMenuItem>
                )}
                
                {canDelete && (
                  <>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-gray-900 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Удалить доску</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Вы уверены, что хотите удалить доску "{board.name}"? Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-700 text-gray-300 hover:bg-gray-600">
                Отмена
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? 'Удаление...' : 'Удалить'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Modal */}
        {showEditModal && (
          <EditBoardModal
            board={board}
            projects={projects}
            open={showEditModal}
            onOpenChange={setShowEditModal}
            onBoardUpdated={handleBoardUpdated}
          />
        )}
      </>
    );
  }

  // Grid view
  return (
    <>
      <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                {board.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-white text-lg font-semibold truncate">
                  {board.name}
                </CardTitle>
                <p className="text-gray-400 text-xs mt-1">
                  {getProjectName(board.project_id)}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                {canEdit && (
                  <DropdownMenuItem 
                    onClick={handleEdit}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Редактировать
                  </DropdownMenuItem>
                )}
                
                {canDelete && (
                  <>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Description */}
            <p className="text-gray-300 text-sm line-clamp-2">
              {board.description || 'Нет описания'}
            </p>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <List className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-xs text-gray-400">Колонки</p>
                  <p className="text-sm font-medium text-white">{board.columns_count || 0}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">Задачи</p>
                  <p className="text-sm font-medium text-white">{board.tasks_count || 0}</p>
                </div>
              </div>
            </div>

            {/* Meta Information */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <Badge variant={board.visibility === 'private' ? 'secondary' : 'default'}>
                {board.visibility === 'private' ? (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Приватная
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Публичная
                  </>
                )}
              </Badge>

              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">
                  {formatDate(board.created_at)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Удалить доску</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Вы уверены, что хотите удалить доску "{board.name}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-gray-300 hover:bg-gray-600">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Modal */}
      {showEditModal && (
        <EditBoardModal
          board={board}
          projects={projects}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onBoardUpdated={handleBoardUpdated}
        />
      )}
    </>
  );
}