import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Calendar,
  CalendarPlus,
  ClipboardCheck,
  Clock,
  FileBarChart,
  FolderKanban,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  Wrench,
  X,
  Bell,
  Boxes,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { apiRequest } from "../services/api.ts";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Admin Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Booking Management", path: "/admin/bookings", icon: ClipboardCheck },
  { label: "Seminar Halls", path: "/admin/halls", icon: Building2 },
  { label: "Hall Availability", path: "/availability", icon: Search },
  { label: "Create Booking", path: "/bookings/new", icon: CalendarPlus },
  { label: "Event Calendar", path: "/calendar", icon: Calendar },
  { label: "Resources & Equipment", path: "/admin/resources", icon: Boxes },
  { label: "Maintenance & Blocks", path: "/admin/maintenance", icon: Wrench },
  { label: "Faculty Accounts", path: "/admin/faculty", icon: Users },
  { label: "Departments", path: "/admin/departments", icon: FolderKanban },
  { label: "Reports & Analytics", path: "/admin/reports", icon: FileBarChart },
  { label: "System Audit Logs", path: "/admin/audit-logs", icon: ShieldAlert },
];

const FACULTY_NAV_ITEMS: NavItem[] = [
  { label: "Faculty Dashboard", path: "/faculty/dashboard", icon: LayoutDashboard },
  { label: "Hall Availability", path: "/availability", icon: Search },
  { label: "Create Booking", path: "/bookings/new", icon: CalendarPlus },
  { label: "Smart Hall Recommender", path: "/recommendations", icon: Sparkles },
  { label: "My Bookings", path: "/faculty/bookings", icon: ClipboardCheck },
  { label: "Booking History", path: "/faculty/history", icon: History },
  { label: "Event Calendar", path: "/calendar", icon: Calendar },
  { label: "Seminar Halls", path: "/halls", icon: Building2 },
  { label: "College Resources", path: "/resources", icon: Boxes },
  { label: "Report Maintenance", path: "/maintenance", icon: Wrench },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = user?.role === "admin" ? ADMIN_NAV_ITEMS : FACULTY_NAV_ITEMS;

  useEffect(() => {
    if (!user) return;
    apiRequest<{ notifications: Array<{ isRead: boolean }> }>("/notifications")
      .then((res) => {
        const unread = res.notifications.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      })
      .catch(() => {});
  }, [user, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const currentNavLabel =
    navItems.find((item) => location.pathname.startsWith(item.path))?.label ||
    (location.pathname === "/notifications"
      ? "Notifications"
      : location.pathname === "/profile"
      ? "Account Profile"
      : "Workspace");

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex">
      {/* Sidebar Navigation — Strictly Clean White Background */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-neutral-200 flex flex-col transition-transform duration-150 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-neutral-200 flex items-center justify-between">
          <Link
            to={user?.role === "admin" ? "/admin/dashboard" : "/faculty/dashboard"}
            className="flex flex-col"
          >
            <span className="text-base font-bold tracking-tight text-neutral-900 whitespace-nowrap">
              SSMIET HallSync AI
            </span>
            <span className="text-[11px] text-neutral-500 whitespace-nowrap">
              Dindigul · Hall Management
            </span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-neutral-500 hover:text-neutral-900"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Context Line */}
        <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/60">
          <div className="text-xs font-medium text-neutral-800 truncate">
            {user?.fullName}
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
            <span className="capitalize">{user?.role}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{user?.departmentName || user?.designation || "SSMIET"}</span>
          </div>
        </div>

        {/* Navigation Links (Strictly filtered by authorized role) */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path + "/"));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile & Logout Controls */}
        <div className="p-3 border-t border-neutral-200 space-y-1 bg-white">
          <Link
            to="/notifications"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === "/notifications"
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            <span className="flex items-center gap-3">
              <Bell className="w-4 h-4 shrink-0" />
              <span>Notifications</span>
            </span>
            {unreadCount > 0 && (
              <span className="text-xs font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-900">
                {unreadCount}
              </span>
            )}
          </Link>

          <Link
            to="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === "/profile"
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>My Profile</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-50/40">
        {/* Top Bar Contract: Breadcrumb on Left, Primary Actions on Right */}
        <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between gap-8 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-neutral-600 hover:text-neutral-900"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-neutral-500 truncate">
              <span className="font-medium text-neutral-700 hidden sm:inline">
                SSMIET Dindigul
              </span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-neutral-900 truncate">
                {currentNavLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/bookings/new"
              className="px-3.5 py-2 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0"
            >
              New Hall Booking
            </Link>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
