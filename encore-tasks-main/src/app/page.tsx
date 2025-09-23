"use client";

import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/refactored/presentation/context/AuthContext";
import { Layout } from "@/components/Layout";
import { NotificationProvider } from "@/components/notifications";

export default function Page() {
  return (
    <AppProvider>
      <AuthProvider>
        <NotificationProvider>
          <Layout />
        </NotificationProvider>
      </AuthProvider>
    </AppProvider>
  );
}
