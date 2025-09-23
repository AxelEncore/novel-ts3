"use client";

import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { getInitials, formatDate } from "@/lib/utils";
import { CustomSelect } from "@/components/CustomSelect";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { UserProfile } from "@/components/UserProfile";
import {
  Users,
  Mail,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  X,
  ExternalLink } from
"lucide-react";

export function TeamPage() {
  const { state, dispatch } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  // Show project members if project selected, otherwise show members from all user's projects
  const allMembers = state.selectedProject 
    ? state.selectedProject.members 
    : (() => {
        // Если пользователь админ, показываем всех одобренных пользователей
        if (state.currentUser?.role === 'admin') {
          return state.users.filter(u => u.isApproved);
        }
        
        // Для обычных пользователей показываем только участников проектов, где они сами участвуют
        const userProjects = state.projects.filter(project => 
          project.members?.some(member => (member.id || member.userId) === state.currentUser?.id) ||
          project.created_by === state.currentUser?.id
        );
        
        const uniqueMembers = new Map();
        userProjects.forEach(project => {
          project.members?.forEach(member => {
            const memberId = member.id || member.userId;
            if ((member.isApproved !== false) && !uniqueMembers.has(memberId)) {
              uniqueMembers.set(memberId, member);
            }
          });
        });
        
        return Array.from(uniqueMembers.values());
      })();
  
  const filteredMembers = (allMembers || []).filter(
    (member) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserStats = (userId: string) => {
    const userTasks = state.tasks.filter(
      (task) => task.assignee_id === userId || task.created_by === userId
    );
    const completedTasks = userTasks.filter((task) => task.status === "done");
    const inProgressTasks = userTasks.filter(
      (task) => task.status === "in_progress"
    );
    const overdueTasks = userTasks.filter((task) => {
      if (!task.deadline && !task.due_date) return false;
      const dueDate = task.deadline || task.due_date;
      return new Date(dueDate) < new Date() && task.status !== "done";
    });

    return {
      total: userTasks.length,
      completed: completedTasks.length,
      inProgress: inProgressTasks.length,
      overdue: overdueTasks.length,
      completionRate:
      userTasks.length > 0 ?
      Math.round((completedTasks.length / userTasks.length) * 100) :
      0
    };
  };

  const handleShowTasks = (memberId: string) => {
    setSelectedMember(memberId);
    setShowTasksModal(true);
  };

  const handleShowProfile = (memberId: string) => {
    setSelectedMember(memberId);
    setShowProfileModal(true);
  };

  const handleRemoveFromProject = (memberId: string) => {
    setMemberToRemove(memberId);
    setShowDeleteModal(true);
  };

  const handleConfirmRemove = () => {
    if (!state.selectedProject || !memberToRemove) return;
    
    const updatedProject = {
      ...state.selectedProject,
      members: state.selectedProject.members?.filter(m => (m.id || m.userId) !== memberToRemove) || []
    };
    dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
    setMemberToRemove(null);
  };

  const getMemberTasks = (memberId: string) => {
    return state.tasks.filter(task => 
      task.assignee_id === memberId || task.created_by === memberId
    );
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in" data-oid="gwb9h2j">
      {/* Header */}
      <div className="flex items-center justify-between" data-oid="3j9y-4h">
        <h1
          className="text-2xl font-bold text-white flex items-center gap-2 animate-slide-in-left"
          data-oid="iohtam9">

          <Users className="w-6 h-6" data-oid="-a2vfgp" />
          Команда
        </h1>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          data-oid="lq6kqz">

          <Plus className="w-4 h-4" data-oid="-ea_d15" />
          Пригласить участника
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4" data-oid="ly1okii">
        <div className="relative flex-1 max-w-md" data-oid="t6gnch">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            data-oid="nu8_ri2" />

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск участников..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
            data-oid="r5j00k_" />

        </div>
        <div className="flex items-center gap-2" data-oid="njmcz">
          <Filter className="w-4 h-4 text-gray-400" data-oid="6v-bm0k" />
          <CustomSelect
            value={selectedProject}
            onChange={setSelectedProject}
            placeholder="Все проекты"
            options={[
              { value: "", label: "Все проекты" },
              ...(state.currentUser?.role === 'admin' 
                ? state.projects 
                : state.projects.filter(project => 
                    project.members?.some(member => member.userId === state.currentUser?.id) ||
                    project.created_by === state.currentUser?.id
                  )
              ).map((project) => ({
                value: project.id,
                label: project.name,
                color: project.color
              }))
            ]}
            className="min-w-[180px]"
          />
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" data-oid="hddkrt2">
        <div
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
          data-oid="bsws1p2">

          <div className="flex items-center justify-between" data-oid="yyv.6po">
            <div data-oid="etpv0zz">
              <p className="text-sm text-gray-400 mb-1" data-oid="7-yfb5x">
                Всего участников
              </p>
              <p className="text-2xl font-bold text-white" data-oid="ltqq_lo">
                {filteredMembers.length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-500/10" data-oid="0jgw1s">
              <Users className="w-6 h-6 text-gray-400" data-oid="47c0ucd" />
            </div>
          </div>
        </div>

        <div
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
          data-oid="qwpqh5">

          <div className="flex items-center justify-between" data-oid="udnoc">
            <div data-oid="1517p3">
              <p className="text-sm text-gray-400 mb-1" data-oid="61hw5d0">
                Активных задач
              </p>
              <p className="text-2xl font-bold text-white" data-oid="kuwwo">
                {state.tasks.filter((t) => 
                  t.status === "in_progress" && 
                  t.assignees?.some(a => a.id === state.currentUser?.id)
                ).length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary-400/10" data-oid="hk0bmyk">
              <Clock className="w-6 h-6 text-yellow-400" data-oid="3i0qkuo" />
            </div>
          </div>
        </div>

        <div
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
          data-oid="cgl8qw9">

          <div className="flex items-center justify-between" data-oid="1gre84">
            <div data-oid="c3dvbj">
              <p className="text-sm text-gray-400 mb-1" data-oid="7cnup62">
                Выполнено
              </p>
              <p className="text-2xl font-bold text-white" data-oid="wawou2">
                {state.tasks.filter((t) => 
                  t.status === "done" && 
                  t.assignees?.some(a => a.id === state.currentUser?.id)
                ).length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary-600/10" data-oid="xe7w_w8">
              <CheckCircle2
                className="w-6 h-6 text-green-400"
                data-oid="xd0d4cm" />

            </div>
          </div>
        </div>

        <div
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
          data-oid="phim8w">

          <div className="flex items-center justify-between" data-oid="58qka41">
            <div data-oid="mfos94">
              <p className="text-sm text-gray-400 mb-1" data-oid="a7vlb0">
                Просрочено
              </p>
              <p className="text-2xl font-bold text-white" data-oid="2xmg13m">
                {
                state.tasks.filter((t) => {
                  if (!t.due_date) return false;
                  return (
                    new Date(t.due_date) < new Date() && t.status !== "done");

                }).length
                }
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary-700/10" data-oid="3z187">
              <AlertTriangle
                className="w-6 h-6 text-red-400"
                data-oid="im9im" />

            </div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
        data-oid="elryihv">

        <h2
          className="text-lg font-semibold text-white mb-6"
          data-oid="lnkdjqi">

          Участники команды
        </h2>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          data-oid="abx25x8">

          {filteredMembers.map((member) => {
            const stats = getUserStats(member.id || member.userId);

            return (
              <div
                key={member.id || member.userId}
                className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-colors"
                data-oid="mk44f21">

                {/* Member Info */}
                <div
                  className="flex items-center gap-4 mb-4"
                  data-oid="emu261b">

                  {state.settings?.showAvatars && (
                    member.avatar ?
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-12 h-12 rounded-full"
                      data-oid="xuhjfol" /> :


                    <div
                      className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium"
                      data-oid="_cxywj5">

                        {getInitials(member.name)}
                      </div>
                  )}
                  <div className="flex-1 min-w-0" data-oid="25v782">
                    <h3
                      className="text-white font-medium truncate"
                      data-oid="vfkrfx">

                      {member.name}
                    </h3>
                    <p
                      className="text-sm text-gray-400 truncate"
                      data-oid="07l9vt2">

                      {member.role === 'admin' ? 'Администратор' : 'Пользователь'}
                    </p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4" data-oid="wv5c63h">
                  <div
                    className="flex items-center gap-2 text-sm text-gray-400"
                    data-oid="zc3e9n">

                    <Mail className="w-4 h-4" data-oid="5n1iln" />
                    <span className="truncate" data-oid="h9pit">
                      {member.email}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-2 text-sm text-gray-400"
                    data-oid="_2yrw8t">

                    <Calendar className="w-4 h-4" data-oid="1u4zsiu" />
                    <span data-oid="00yp87">
                      С {member.createdAt && !isNaN(new Date(member.createdAt).getTime()) ? formatDate(new Date(member.createdAt)) : 'Неизвестно'}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3" data-oid="sfl577">
                  <div
                    className="flex justify-between items-center"
                    data-oid="hl6ginn">

                    <span className="text-sm text-gray-400" data-oid="tp4dc6">
                      Выполнение
                    </span>
                    <span
                      className="text-sm text-white font-medium"
                      data-oid="s46cugs">

                      {stats.completionRate}%
                    </span>
                  </div>
                  <div
                    className="w-full bg-gray-700 rounded-full h-2"
                    data-oid="apar34">

                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.completionRate}%` }}
                      data-oid="bxf685" />

                  </div>

                  <div
                    className="grid grid-cols-3 gap-2 text-center"
                    data-oid="mzo65so">

                    <div data-oid="4b9v3">
                      <p
                        className="text-lg font-semibold text-white"
                        data-oid="3irf27">

                        {stats.total}
                      </p>
                      <p className="text-xs text-gray-400" data-oid="pxa_va6">
                        Всего
                      </p>
                    </div>
                    <div data-oid="979pol5">
                      <p
                        className="text-lg font-semibold text-green-400"
                        data-oid="u9g0io">

                        {stats.completed}
                      </p>
                      <p className="text-xs text-gray-400" data-oid="b7abe9g">
                        Готово
                      </p>
                    </div>
                    <div data-oid="vbf2sge">
                      <p
                        className="text-lg font-semibold text-yellow-400"
                        data-oid="21rns2">

                        {stats.inProgress}
                      </p>
                      <p className="text-xs text-gray-400" data-oid="qfgobh">
                        В работе
                      </p>
                    </div>
                  </div>

                  {stats.overdue > 0 &&
                  <div
                    className="flex items-center gap-2 p-2 bg-primary-700/10 rounded-lg"
                    data-oid="wmwrufh">

                      <AlertTriangle
                      className="w-4 h-4 text-red-400"
                      data-oid="hxr6g7b" />

                      <span className="text-sm text-red-400" data-oid="cib5bg">
                        {stats.overdue} просроченных задач
                      </span>
                    </div>
                  }
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4" data-oid="yub11sg">
                  <button
                    onClick={() => handleShowTasks(member.id || member.userId)}
                    className="flex-1 px-3 py-2 bg-primary-500/20 text-primary-300 rounded-lg hover:bg-primary-500/30 transition-colors text-sm"
                    data-oid="34ovrb0">

                    Задачи
                  </button>
                  <button
                    onClick={() => handleShowProfile(member.id || member.userId)}
                    className="flex-1 px-3 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors text-sm"
                    data-oid="8rvijfa">

                    Профиль
                  </button>
                  {state.selectedProject && state.currentUser?.role === 'admin' && (member.id || member.userId) !== state.currentUser?.id && (
                    <button
                      onClick={() => handleRemoveFromProject(member.id || member.userId)}
                      className="px-3 py-2 bg-primary-700/20 text-primary-300 rounded-lg hover:bg-primary-700/30 transition-colors text-sm"
                      title="Удалить из проекта">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>);

          })}
        </div>

        {filteredMembers.length === 0 &&
        <div className="text-center py-12" data-oid="8k2muf">
            <Users
            className="w-12 h-12 text-gray-400 mx-auto mb-4"
            data-oid="u5omqtr" />

            {state.selectedProject ? (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Участники не найдены</h3>
                <p className="text-gray-400">В выбранном проекте нет участников, соответствующих критериям поиска</p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Вас пока никуда не добавили</h3>
                <p className="text-gray-400 mb-4">Вы не являетесь участником ни одного проекта. Обратитесь к администратору для добавления в проект.</p>
                <p className="text-sm text-gray-500">Здесь будут отображаться все пользователи системы, когда вы станете участником проекта.</p>
              </div>
            )}
          </div>
        }
      </div>

      {/* Tasks Modal */}
      {showTasksModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">
                Задачи участника: {filteredMembers.find(m => m.id === selectedMember)?.name}
              </h3>
              <button
                onClick={() => setShowTasksModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
              {getMemberTasks(selectedMember).map((task) => (
                <div key={task.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1">{task.title}</h4>
                      {task.description && (
                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className={`px-2 py-1 rounded ${
                          task.status === 'done' ? 'bg-emerald-500/25 text-emerald-400' :
          task.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
  
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {task.status === 'done' ? 'Выполнено' :
                             task.status === 'in_progress' ? 'В работе' :
 'К выполнению'}
                        </span>
                        <span className={`px-2 py-1 rounded ${
                          task.priority === 'urgent' ? 'bg-red-600/20 text-red-400' :
          task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
          task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-gray-400/20 text-gray-400'
                        }`}>
                          {task.priority === 'urgent' ? 'Срочный' :
                           task.priority === 'high' ? 'Высокий' :
                           task.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </span>
                        {task.due_date && (
                          <span>Срок: {!isNaN(new Date(task.due_date).getTime()) ? formatDate(new Date(task.due_date)) : 'Неверная дата'}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const project = state.projects.find(p => p.id === task.project_id);
                        const board = state.boards.find(b => b.id === task.board_id);
                        if (project && board) {
                          dispatch({ type: 'SELECT_PROJECT', payload: project });
                          dispatch({ type: 'SELECT_BOARD', payload: board });
                          setShowTasksModal(false);
                          window.dispatchEvent(new CustomEvent('navigate-to-boards'));
                        }
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Перейти к задаче">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
              {getMemberTasks(selectedMember).length === 0 && (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">У участника нет задач</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfile
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userId={selectedMember || undefined}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
         isOpen={showDeleteModal}
         onClose={() => {
           setShowDeleteModal(false);
           setMemberToRemove(null);
         }}
         onConfirm={handleConfirmRemove}
         title="Удалить участника из проекта"
         message={`Вы уверены, что хотите удалить ${memberToRemove ? filteredMembers.find(m => m.id === memberToRemove)?.name : 'этого участника'} из проекта? Это действие нельзя отменить.`}
       />
    </div>);

}