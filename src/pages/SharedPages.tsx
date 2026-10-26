import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Calendar as CalendarIcon,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { apiRequest } from "../services/api.ts";

// 1. Event Calendar Page (Strictly shows actual PostgreSQL booking records)
export const CalendarPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest<{ bookings: any[] }>("/bookings")
      .then((res) => setBookings(res.bookings))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: Array<string | null> = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    calendarDays.push(dateStr);
  }

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const bookingsForSelectedDate = bookings.filter(
    (b) => b.bookingDate === selectedDateStr
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Seminar Hall Event Calendar
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Navigate dates and inspect verified seminar hall bookings across SSMIET.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 border border-neutral-300 rounded-lg bg-white hover:bg-neutral-50"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-1.5 text-sm font-bold text-neutral-900 min-w-[160px] text-center">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 border border-neutral-300 rounded-lg bg-white hover:bg-neutral-50"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-xl p-5">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-500 pb-3 border-b border-neutral-200">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-1 pt-2">
            {calendarDays.map((dateStr, idx) => {
              if (!dateStr) {
                return <div key={`empty-${idx}`} className="h-24 p-2" />;
              }
              const dayNum = Number(dateStr.split("-")[2]);
              const dayBookings = bookings.filter(
                (b) => b.bookingDate === dateStr && b.status !== "cancelled"
              );
              const isSelected = dateStr === selectedDateStr;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`h-24 p-2 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                    isSelected
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200 bg-white hover:bg-neutral-50/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-neutral-900">
                      {dayNum}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-[10px] font-mono text-neutral-500">
                        {dayBookings.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    {dayBookings.slice(0, 2).map((b) => (
                      <div
                        key={b.id}
                        className={`text-[10px] truncate px-1.5 py-0.5 rounded font-medium ${
                          b.status === "approved"
                            ? "bg-emerald-50 text-emerald-800"
                            : b.status === "pending"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {b.startTime} {b.eventName}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Schedule Panel */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <div className="border-b border-neutral-200 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Schedule for {selectedDateStr}
              </h2>
              <p className="text-xs text-neutral-500">
                {bookingsForSelectedDate.length} booking(s) on this date
              </p>
            </div>
            <Link
              to={`/bookings/new?date=${selectedDateStr}`}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg"
            >
              Book Date
            </Link>
          </div>

          {loading ? (
            <p className="text-xs text-neutral-500">Loading calendar events...</p>
          ) : bookingsForSelectedDate.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CalendarIcon className="w-7 h-7 text-neutral-300 mx-auto" />
              <p className="text-sm text-neutral-600">No bookings available.</p>
              <p className="text-xs text-neutral-400">
                No events are scheduled for {selectedDateStr}.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {bookingsForSelectedDate.map((b) => (
                <div key={b.id} className="py-3.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-neutral-900">
                      {b.startTime} – {b.endTime}
                    </span>
                    <span
                      className={`font-semibold capitalize ${
                        b.status === "approved"
                          ? "text-emerald-700"
                          : b.status === "pending"
                          ? "text-amber-700"
                          : "text-neutral-500"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-neutral-900">
                    {b.eventName}
                  </div>
                  <div className="text-neutral-600">
                    {b.hallName} · {b.organizerName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 2. Notifications Page
export const NotificationsPage: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ notifications: any[] }>("/notifications");
      setList(res.notifications);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    await apiRequest("/notifications/read-all", { method: "PATCH" });
    await loadNotifications();
  };

  const handleMarkOneRead = async (id: number) => {
    await apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
    await loadNotifications();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Alerts regarding booking requests, approvals, rejections, and
            maintenance updates.
          </p>
        </div>
        {list.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 text-xs font-medium border border-neutral-300 rounded-lg bg-white hover:bg-neutral-50 flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-sm text-neutral-500">Loading notifications...</div>
      ) : list.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center space-y-2">
          <Bell className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900">
            No notifications available.
          </h3>
          <p className="text-xs text-neutral-500">
            You have no unread or archived notifications in PostgreSQL.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-200">
          {list.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex items-start justify-between gap-4 ${
                !n.isRead ? "bg-neutral-50/70" : "bg-white"
              }`}
            >
              <div className="space-y-1">
                <div className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <span>{n.title}</span>
                  {!n.isRead && (
                    <span className="text-xs font-semibold text-emerald-700">
                      Unread
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {n.message}
                </p>
                <div className="text-[11px] font-mono text-neutral-400">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => handleMarkOneRead(n.id)}
                  className="px-2.5 py-1 text-xs font-medium border border-neutral-300 rounded text-neutral-700 hover:bg-white shrink-0"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 3. User Profile Page
export const ProfilePage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [designation, setDesignation] = useState(user?.designation || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      await apiRequest("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          fullName,
          designation,
          phone,
          ...(newPassword ? { newPassword } : {}),
        }),
      });
      setNewPassword("");
      await refreshProfile();
      setMessage("Profile and security settings updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-neutral-200 pb-5">
        <h1 className="text-2xl font-bold text-neutral-900">Account Profile</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Manage your personal details and authentication credentials.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4 text-sm"
      >
        {message && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            {message}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Institutional Email
            </label>
            <input
              type="text"
              disabled
              value={user?.email || ""}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              System Role
            </label>
            <input
              type="text"
              disabled
              value={user?.role?.toUpperCase() || ""}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Designation
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-200">
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Change Password (optional, min 8 characters)
          </label>
          <input
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
          />
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            className="px-5 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            Save Profile Changes
          </button>
        </div>
      </form>
    </div>
  );
};

// 4. Unauthorized Access Page
export const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center max-w-lg mx-auto my-12 space-y-4">
      <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
      <h1 className="text-xl font-bold text-neutral-900">
        Unauthorized Access (403)
      </h1>
      <p className="text-xs text-neutral-600 leading-relaxed">
        Your account ({user?.email}) does not have administrator permissions to
        access this resource.
      </p>
      <Link
        to={user?.role === "admin" ? "/admin/dashboard" : "/faculty/dashboard"}
        className="inline-block px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg"
      >
        Return to Dashboard
      </Link>
    </div>
  );
};
