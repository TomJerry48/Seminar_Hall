/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { Layout } from "./components/Layout.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { HallDetailPage, HallsPage } from "./pages/HallsPage.tsx";
import {
  AvailabilitySearchPage,
  BookingHistoryPage,
  BookingsListPage,
  CreateBookingPage,
  RecommendationsPage,
} from "./pages/BookingsPages.tsx";
import {
  MaintenancePage,
  ResourcesPage,
} from "./pages/ResourceMaintenancePages.tsx";
import {
  AuditLogsPage,
  DepartmentsPage,
  FacultyManagementPage,
  ReportsPage,
} from "./pages/AdminPages.tsx";
import {
  CalendarPage,
  NotificationsPage,
  ProfilePage,
  UnauthorizedPage,
} from "./pages/SharedPages.tsx";

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole?: "admin" | "faculty";
}> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-sm text-neutral-500">
        Verifying session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <Layout>
        <UnauthorizedPage />
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
};

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-sm text-neutral-500">
        Loading SSMIET HallSync AI...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Navigate
      to={user.role === "admin" ? "/admin/dashboard" : "/faculty/dashboard"}
      replace
    />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Administrator Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/halls"
            element={
              <ProtectedRoute requiredRole="admin">
                <HallsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute requiredRole="admin">
                <BookingsListPage myOnly={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/resources"
            element={
              <ProtectedRoute requiredRole="admin">
                <ResourcesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/maintenance"
            element={
              <ProtectedRoute requiredRole="admin">
                <MaintenancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/faculty"
            element={
              <ProtectedRoute requiredRole="admin">
                <FacultyManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute requiredRole="admin">
                <DepartmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute requiredRole="admin">
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute requiredRole="admin">
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />

          {/* Faculty Routes */}
          <Route
            path="/faculty/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/bookings"
            element={
              <ProtectedRoute>
                <BookingsListPage myOnly={true} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/history"
            element={
              <ProtectedRoute>
                <BookingHistoryPage />
              </ProtectedRoute>
            }
          />

          {/* Shared Authenticated Routes */}
          <Route
            path="/halls"
            element={
              <ProtectedRoute>
                <HallsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/halls/:id"
            element={
              <ProtectedRoute>
                <HallDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/availability"
            element={
              <ProtectedRoute>
                <AvailabilitySearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings/new"
            element={
              <ProtectedRoute>
                <CreateBookingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute>
                <RecommendationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <ProtectedRoute>
                <ResourcesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance"
            element={
              <ProtectedRoute>
                <MaintenancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unauthorized"
            element={
              <ProtectedRoute>
                <UnauthorizedPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
