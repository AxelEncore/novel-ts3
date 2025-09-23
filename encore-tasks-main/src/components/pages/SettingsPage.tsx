"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
  Eye,
  EyeOff } from
"lucide-react";
import { CustomSelect } from "../CustomSelect";

export function SettingsPage() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<
    "profile" | "notifications" | "security" | "appearance">(
    "profile");
  const [showPassword, setShowPassword] = useState(false);
  const [lightThemeAttempts, setLightThemeAttempts] = useState(0);
  const [warningMessage, setWarningMessage] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  const [profileData, setProfileData] = useState({
    name: state.currentUser?.name || "",
    email: state.currentUser?.email || "",
    avatar: state.currentUser?.avatar || ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Initialize settings from context
  useEffect(() => {
    // Settings are now managed in the global context
  }, [state.settings]);

  const handleSaveProfile = async () => {
    if (!state.currentUser) return;

    try {
      const response = await fetch(`/api/users/${state.currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при сохранении');
      }

      const { user } = await response.json();
      
      // Обновляем пользователя в глобальном состоянии
      const updatedUser = {
        ...state.currentUser,
        name: user.name,
        email: user.email,
        avatar: user.avatar || state.currentUser.avatar
      };

      dispatch({ type: "SET_CURRENT_USER", payload: updatedUser });
      
      // Показываем уведомление об успешном сохранении
      alert('Профиль успешно обновлен!');
      
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Ошибка при сохранении профиля: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  };

  const handleSettingsChange = (key: string, value: any) => {
    if (key === "theme" && value === "light") {
      const newAttempts = lightThemeAttempts + 1;
      setLightThemeAttempts(newAttempts);
      
      const messages = [
        "Ненене, не стоит сюда лезть",
        "стой, подумай", 
        "оставь надежду, это для твоего блага",
        "я предупреждал"
      ];
      
      if (newAttempts <= 4) {
        setWarningMessage(messages[newAttempts - 1]);
        setShowWarning(true);
        
        setTimeout(() => {
          setShowWarning(false);
        }, 3000);
        
        return; // Не применяем светлую тему
      }
      
      // На 5-й попытке разрешаем включить светлую тему
      setLightThemeAttempts(0);
    }
    
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: { [key]: value }
    });
  };



  const tabs = [
  { id: "profile", label: "Профиль", icon: User },
  { id: "notifications", label: "Уведомления", icon: Bell },
  { id: "security", label: "Безопасность", icon: Shield },
  { id: "appearance", label: "Внешний вид", icon: Palette }];


  return (
    <div className="p-6 space-y-6 animate-fade-in" data-oid="oy0uz9i">
      {/* Warning Message */}
      {showWarning && (
        <div className="fixed top-4 right-4 z-50 bg-primary-700 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce-in">
          {warningMessage}
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between" data-oid="oovdona">
        <h1
          className="text-2xl font-bold text-white flex items-center gap-2 animate-slide-in-left"
          data-oid="8f-kwtd">

          <Settings className="w-6 h-6" data-oid="5yljbub" />
          Настройки
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" data-oid="muyzzjo">
        {/* Sidebar */}
        <div className="lg:col-span-1" data-oid="1ckl7eq">
          <div
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
            data-oid="qhacnxu">

            <nav className="space-y-2" data-oid="t398hi5">
              {tabs.map((tab) =>
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeTab === tab.id ?
                "bg-primary-500/20 text-primary-300" :
                "text-gray-400 hover:text-white hover:bg-white/5"}`
                }
                data-oid="p2fgfij">

                  <tab.icon className="w-5 h-5" data-oid="08go-3" />
                  <span data-oid="6qi-e4f">{tab.label}</span>
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3" data-oid="11-b0sj">
          <div
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
            data-oid="-p44gid">

            {activeTab === "profile" &&
            <div className="space-y-6" data-oid="j99f3su">
                <h2
                className="text-xl font-semibold text-white"
                data-oid="7mwcbeh">

                  Профиль пользователя
                </h2>

                {/* Avatar */}
                <div className="flex items-center gap-6" data-oid="grn69i1">
                  <div className="relative" data-oid="92o6_-h">
                    {profileData.avatar ?
                  <img
                    src={profileData.avatar}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full"
                    data-oid="eh1n3iu" /> :


                  <div
                    className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                    data-oid="l-3zzup">

                        {profileData.name.charAt(0)}
                      </div>
                  }

                  </div>
                  <div data-oid="2_e2egn">
                    <h3 className="text-white font-medium" data-oid="z49nqzl">
                      {profileData.name}
                    </h3>
                    <p className="text-gray-400" data-oid="pjhj-ih">
                      {state.currentUser?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                    </p>
                  </div>
                </div>

                {/* Form */}
                <div
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                data-oid="-rd_3i0">

                  <div data-oid="ure_1pd">
                    <label
                    className="block text-sm font-medium text-gray-300 mb-2"
                    data-oid="iel1vaj">

                      Имя
                    </label>
                    <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    data-oid="g0_-bt8" />

                  </div>

                  <div data-oid="v2t_183">
                    <label
                    className="block text-sm font-medium text-gray-300 mb-2"
                    data-oid="in0gv_:">

                      Email
                    </label>
                    <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      email: e.target.value
                    })
                    }
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    data-oid="ho8f5li" />

                  </div>
                </div>

                <button
                onClick={handleSaveProfile}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                data-oid="i3doie4">

                  <Save className="w-4 h-4" data-oid="b82mehl" />
                  Сохранить изменения
                </button>
              </div>
            }

            {activeTab === "notifications" &&
            <div className="space-y-6" data-oid="pj-y6cn">
                <h2
                className="text-xl font-semibold text-white"
                data-oid="e8owvly">

                  Настройки уведомлений
                </h2>

                <div className="space-y-4" data-oid="4wjpdjf">
                  <div
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                  data-oid="xh14cns">

                    <div data-oid="9uh-3xn">
                      <h3 className="text-white font-medium" data-oid="15hngwf">
                        Email уведомления
                      </h3>
                      <p className="text-gray-400 text-sm" data-oid="ji2r7sr">
                        Получать уведомления на email
                      </p>
                    </div>
                    <label
                    className="relative inline-flex items-center cursor-pointer"
                    data-oid="5lgggsy">

                      <input
                      type="checkbox"
                      checked={state.settings?.emailNotifications || false}
                      onChange={(e) =>
                        handleSettingsChange("emailNotifications", e.target.checked)
                      }
                      className="sr-only peer"
                      data-oid="xtzs28b" />


                      <div
                      className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"
                      data-oid="_ngco6y">
                    </div>
                    </label>
                  </div>

                  <div
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                  data-oid="k60r1-c">

                    <div data-oid="1refa0x">
                      <h3 className="text-white font-medium" data-oid="vyrwef_">
                        Telegram уведомления
                      </h3>
                      <p className="text-gray-400 text-sm" data-oid="wu7w0-">
                        Получать уведомления в Telegram
                      </p>
                    </div>
                    <label
                    className="relative inline-flex items-center cursor-pointer"
                    data-oid="75a-t21">

                      <input
                      type="checkbox"
                      checked={state.settings?.telegramNotifications || false}
                      onChange={(e) =>
                        handleSettingsChange("telegramNotifications", e.target.checked)
                      }
                      className="sr-only peer"
                      data-oid="6v-1-b" />


                      <div
                      className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"
                      data-oid="ysxp3ya">
                    </div>
                    </label>
                  </div>

                  <div className="space-y-3" data-oid="q_hc92f">
                    <h3 className="text-white font-medium" data-oid="hgsdjx">
                      Типы уведомлений
                    </h3>

                    {[
                  { key: "taskAssigned", label: "Назначение задач" },
                  { key: "taskCompleted", label: "Завершение задач" },
                  {
                    key: "deadlineReminder",
                    label: "Напоминания о дедлайнах"
                  },
                  { key: "projectUpdates", label: "Обновления проектов" }].
                  map((item) =>
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    data-oid="vwd5syv">

                        <span className="text-gray-300" data-oid="k92u_ma">
                          {item.label}
                        </span>
                        <label
                      className="relative inline-flex items-center cursor-pointer"
                      data-oid="l_zs1vx">

                          <input
                        type="checkbox"
                        checked={
                        state.settings?.[item.key as keyof typeof state.settings] as boolean || false
                        }
                        onChange={(e) =>
                          handleSettingsChange(item.key, e.target.checked)
                        }
                        className="sr-only peer"
                        data-oid="rv1-z6m" />


                          <div
                        className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"
                        data-oid="7s9h1kr">
                      </div>
                        </label>
                      </div>
                  )}
                  </div>
                </div>
              </div>
            }

            {activeTab === "security" &&
            <div className="space-y-6" data-oid="p2s2rgx">
                <h2
                className="text-xl font-semibold text-white"
                data-oid="iv9:192">

                  Безопасность
                </h2>

                <div className="space-y-6" data-oid="jxncdge">
                  <div data-oid="q_c45t6">
                    <h3
                    className="text-white font-medium mb-4"
                    data-oid="ak97-3">

                      Смена пароля
                    </h3>
                    <div className="space-y-4" data-oid="rlxwd33">
                      <div data-oid="b5ftn6_">
                        <label
                        className="block text-sm font-medium text-gray-300 mb-2"
                        data-oid="4ro5c-6">

                          Текущий пароль
                        </label>
                        <div className="relative" data-oid="xjiayd">
                          <input
                          type={showPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            currentPassword: e.target.value
                          })
                          }
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                          data-oid="hf7nn-7" />


                          <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                          data-oid="rn-td-c">

                            {showPassword ?
                          <EyeOff className="w-4 h-4" data-oid="r-yn60d" /> :

                          <Eye className="w-4 h-4" data-oid="tq3z_jg" />
                          }
                          </button>
                        </div>
                      </div>

                      <div data-oid="x02x3sa">
                        <label
                        className="block text-sm font-medium text-gray-300 mb-2"
                        data-oid="h1-1osj">

                          Новый пароль
                        </label>
                        <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value
                        })
                        }
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        data-oid="7dhz71-" />

                      </div>

                      <div data-oid="n83mnpm">
                        <label
                        className="block text-sm font-medium text-gray-300 mb-2"
                        data-oid="5n5vr6x">

                          Подтвердите пароль
                        </label>
                        <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value
                        })
                        }
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        data-oid="j-u8nnm" />

                      </div>

                      <button
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                      data-oid="090u-b">

                        Изменить пароль
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            }

            {activeTab === "appearance" &&
            <div className="space-y-6" data-oid="f2-p1_8">
                <h2
                className="text-xl font-semibold text-white"
                data-oid="7educ2r">

                  Внешний вид
                </h2>

                <div className="space-y-4" data-oid="u6-1f-7">
                  <div
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                  data-oid="cdje_hn">

                    <div data-oid="0-zuwex">
                      <h3 className="text-white font-medium" data-oid="hd7l2c7">
                        Тема
                      </h3>
                      <p className="text-gray-400 text-sm" data-oid="2buj58y">
                        Выберите цветовую схему
                      </p>
                    </div>
                    <div className="relative">
                      <CustomSelect
                        value={state.settings?.theme || "dark"}
                        onChange={(value) =>
                          handleSettingsChange("theme", value)
                        }
                        options={[
                          { value: "dark", label: "Темная" },
                          { value: "light", label: "Светлая" },
                          { value: "auto", label: "Автоматически" }
                        ]}
                        placeholder="Выберите тему"
                      />
                      {showWarning && (
                        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-primary-500/20 border border-primary-500/30 rounded-lg text-primary-300 text-sm animate-fade-in z-10">
                          {warningMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                  data-oid="hr1gr-d">

                    <div data-oid="_-7xs5b">
                      <h3 className="text-white font-medium" data-oid="bmtbjh2">
                        Язык
                      </h3>
                      <p className="text-gray-400 text-sm" data-oid="hgxiaca">
                        Язык интерфейса
                      </p>
                    </div>
                    <CustomSelect
                      value={state.settings?.language || "ru"}
                      onChange={(value) =>
                        handleSettingsChange("language", value)
                      }
                      options={[
                        { value: "ru", label: "Русский" },
                        { value: "en", label: "English" }
                      ]}
                      placeholder="Выберите язык"
                    />
                  </div>

                  <div
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                  data-oid="x3cfn43">

                    <div data-oid="q91a0_n">
                      <h3 className="text-white font-medium" data-oid="0-ea98w">
                        Компактный режим
                      </h3>
                      <p className="text-gray-400 text-sm" data-oid="n1cczbx">
                        Уменьшить отступы и размеры элементов
                      </p>
                    </div>
                    <label
                    className="relative inline-flex items-center cursor-pointer"
                    data-oid="biq82gm">

                      <input
                      type="checkbox"
                      checked={state.settings?.compactMode || false}
                      onChange={(e) =>
                        handleSettingsChange("compactMode", e.target.checked)
                      }
                      className="sr-only peer"
                      data-oid="ak-t6hs" />


                      <div
                      className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"
                      data-oid="3215477">
                    </div>
                    </label>
                  </div>

                  <div
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                  data-oid="z-c7slc">

                    <div data-oid="w29spni">
                      <h3 className="text-white font-medium" data-oid="gqvxmls">
                        Показывать аватары
                      </h3>
                      <p className="text-gray-400 text-sm" data-oid="hu6ubt9">
                        Отображать аватары пользователей
                      </p>
                    </div>
                    <label
                    className="relative inline-flex items-center cursor-pointer"
                    data-oid="k6jc7g8">

                      <input
                      type="checkbox"
                      checked={state.settings?.showAvatars || false}
                      onChange={(e) =>
                        handleSettingsChange("showAvatars", e.target.checked)
                      }
                      className="sr-only peer"
                      data-oid="fbnbes" />


                      <div
                      className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"
                      data-oid="ibw9p6x">
                    </div>
                    </label>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>);

}