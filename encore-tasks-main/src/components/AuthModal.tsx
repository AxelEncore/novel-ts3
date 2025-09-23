"use client";

import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { dispatch, login } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email обязателен";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Неверный формат email";
    }

    if (!formData.password) {
      newErrors.password = "Пароль обязателен";
    } else if (formData.password.length < 6) {
      newErrors.password = "Пароль должен содержать минимум 6 символов";
    }

    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = "Имя обязательно";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Пароли не совпадают";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (isLogin) {
      // Login logic using API
      const success = await login(formData.email, formData.password);
      
      if (!success) {
        setErrors({ email: "Неверный email или пароль" });
        return;
      }
    } else {
      // Registration logic using API
      const response = await api.register(formData.name, formData.email, formData.password);
      
      if (response.error) {
        if (response.error.includes('already exists')) {
          setErrors({ email: "Пользователь с таким email уже существует" });
        } else {
          setErrors({ email: response.error });
        }
        return;
      }
      
      // Проверяем, требуется ли подтверждение
      if ((response.data as any).requiresApproval) {
        // Устанавливаем пользователя как аутентифицированного, но неодобренного
        if (response.data.user) {
          dispatch({
            type: 'LOGIN',
            payload: {
              id: response.data.user.id,
              name: response.data.user.name,
              email: response.data.user.email,
              role: response.data.user.role,
              isApproved: false,
              avatar: response.data.user.avatar,
              created_at: response.data.user.created_at || new Date().toISOString(),
              updated_at: response.data.user.updated_at || new Date().toISOString()
            }
          });
        }
        
        onClose();
        
        // Reset form
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: ""
        });
        setErrors({});
        return;
      }
      
      // Если подтверждение не требуется (например, для админов), пытаемся войти
      const loginSuccess = await login(formData.email, formData.password);
      
      if (!loginSuccess) {
        setErrors({ email: "Регистрация прошла успешно, но не удалось войти в систему" });
        return;
      }
    }

    onClose();

    // Reset form
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    });
    setErrors({});
  };



  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm modal-overlay animate-fade-in"
      data-oid="3ye2vpd">

      <div
        className="w-full max-w-md bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden modal-content animate-scale-in"
        data-oid="0m9:rvw">

        {/* Header */}
        <div className="p-6 border-b border-white/10" data-oid=":6ybbdd">
          <div
            className="flex items-center justify-center gap-2 mb-4"
            data-oid="mvmftvv">

            <div
              className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center"
              data-oid="ybrgm_b">

              <span className="text-white font-bold" data-oid="sg_oky:">
                T
              </span>
            </div>
            <h1 className="text-2xl text-white" data-oid="0xqvbcp">
               <span className="font-black">ENCORE</span> <span className="relative -top-0.5">|</span> <span className="text-primary-500 font-medium">TASKS</span>
            </h1>
          </div>

          <div className="flex bg-white/5 rounded-lg p-1" data-oid="0bfjcn-">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isLogin ?
              "bg-primary-500 text-white" :
              "text-gray-400 hover:text-white"}`
              }
              data-oid="faphu9.">

              Вход
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isLogin ?
              "bg-primary-500 text-white" :
              "text-gray-400 hover:text-white"}`
              }
              data-oid="hgv7a86">

              Регистрация
            </button>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4"
          data-oid="0i2lf_1">

          {!isLogin &&
          <div data-oid="afiw-qf">
              <label
              className="block text-sm font-medium text-gray-300 mb-2"
              data-oid="q1yv0jx">

                Имя
              </label>
              <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 ${
              errors.name ? "border-red-500" : "border-white/10"}`
              }
              placeholder="Введите ваше имя"
              data-oid="_03_n3m" />


              {errors.name &&
            <p className="text-red-400 text-sm mt-1" data-oid="2.0k4wv">
                  {errors.name}
                </p>
            }
            </div>
          }

          <div data-oid="b5smqad">
            <label
              className="block text-sm font-medium text-gray-300 mb-2"
              data-oid="v:tvzde">

              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 ${
              errors.email ? "border-red-500" : "border-white/10"}`
              }
              placeholder="Введите ваш email"
              data-oid="ua:--nc" />


            {errors.email &&
            <p className="text-red-400 text-sm mt-1" data-oid="apl16r8">
                {errors.email}
              </p>
            }
          </div>

          <div data-oid="yl9:isw">
            <label
              className="block text-sm font-medium text-gray-300 mb-2"
              data-oid="l.q58sh">

              Пароль
            </label>
            <div className="relative" data-oid="mx027n-">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={`w-full px-4 py-2 pr-12 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 ${
                errors.password ? "border-red-500" : "border-white/10"}`
                }
                placeholder="Введите пароль"
                data-oid="dth2pxi" />


              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                data-oid="t3dlh_w">

                {showPassword ?
                <EyeOff className="w-5 h-5" data-oid="rm0.2vc" /> :

                <Eye className="w-5 h-5" data-oid="3avvs0l" />
                }
              </button>
            </div>
            {errors.password &&
            <p className="text-red-400 text-sm mt-1" data-oid="52-5pe-">
                {errors.password}
              </p>
            }
          </div>

          {!isLogin &&
          <div data-oid="l06ze1.">
              <label
              className="block text-sm font-medium text-gray-300 mb-2"
              data-oid="r4plpq7">

                Подтвердите пароль
              </label>
              <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
              handleInputChange("confirmPassword", e.target.value)
              }
              className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 ${
              errors.confirmPassword ? "border-red-500" : "border-white/10"}`
              }
              placeholder="Подтвердите пароль"
              data-oid="j6aq-de" />


              {errors.confirmPassword &&
            <p className="text-red-400 text-sm mt-1" data-oid="r_7:1ha">
                  {errors.confirmPassword}
                </p>
            }
            </div>
          }

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            data-oid="o6-jl2i">

            {isLogin ?
            <>
                <LogIn className="w-4 h-4" data-oid="srdk2tq" />
                Войти
              </> :
            <>
                <UserPlus className="w-4 h-4" data-oid="lw0h7pr" />
                Зарегистрироваться
              </>
            }
          </button>
        </form>
      </div>
    </div>
  );
}