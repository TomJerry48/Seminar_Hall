import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Users,
  Wrench,
  Boxes,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { apiRequest } from "../services/api.ts";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest("/dashboard");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleQuickBookingAction = async (
    bookingId: number,
    status: "approved" | "rejected"
  ) => {
    try {
      await apiRequest(`/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to update booking status.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-neutral-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 bg-white border border-neutral-200 rounded-xl p-5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white border border-red-200 rounded-xl text-sm text-red-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
        <button
          onClick={loadDashboard}
          className="px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const metrics = data?.metrics || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {isAdmin ? "Administrator Overview" : "Faculty Dashboard"}
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Welcome back, {user?.fullName}. All metrics below reflect live PostgreSQL
            records for SSMIET Dindigul.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/availability"
            className="px-4 py-2 text-xs font-medium border border-neutral-300 bg-white text-neutral-800 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Search Available Halls
          </Link>
          {isAdmin ? (
            <Link
              to="/admin/halls"
              className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage Halls</span>
            </Link>
          ) : (
            <Link
              to="/bookings/new"
              className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Booking</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Metrics Row */}
      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="text-xs font-medium text-neutral-500">Registered Halls</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-2">
              {metrics.totalHalls ?? 0}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {metrics.activeHalls ?? 0} active
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="text-xs font-medium text-neutral-500">Active Faculty</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-2">
              {metrics.activeFaculty ?? 0}
            </div>
            <div className="text-xs text-neutral-500 mt-1">Authorized accounts</div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="text-xs font-medium text-neutral-500">Upcoming Bookings</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-2">
              {metrics.upcomingBookingsCount ?? 0}
            </div>
            <div className="text-xs text-neutral-500 mt-1">Current &amp; future</div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="text-xs font-medium text-neutral-500">Pending Requests</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-2">
              {metrics.pendingBookingsCount ?? 0}
            </div>
            <div className="text-xs text-neutral-500 mt-1">Awaiting decision</div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="text-xs font-medium text-neutral-500">Open Maintenance</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-red-700 mt-2">
              {metrics.openMaintenanceCount ?? 0}
            </div>
            <div className="text-xs text-neutral-500 mt-1">Unresolved reports</div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="text-xs font-medium text-neutral-500">
              Available Resources
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-2">
              {metrics.availableResourcesCount ?? 0}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              of {metrics.totalResourcesCount ?? 0} registered types
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="text-xs font-medium text-neutral-500">
              Upcoming Personal Bookings
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-2">
              {metrics.upcomingPersonalCount ?? 0}
            </div>
            <div className="text-xs text-neutral-500 mt-1">Scheduled events</div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="text-xs font-medium text-neutral-500">
              Pending Approval
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-2">
              {metrics.pendingPersonalCount ?? 0}
            </div>
            <div className="text-xs text-neutral-500 mt-1">Awaiting admin review</div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="text-xs font-medium text-neutral-500">
              Approved Bookings
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-2">
              {metrics.approvedPersonalCount ?? 0}
            </div>
            <div className="text-xs text-neutral-500 mt-1">Confirmed reservations</div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="text-xs font-medium text-neutral-500">
              Active Seminar Halls
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-2">
              {metrics.activeHallsCount ?? 0}
            </div>
            <div className="text-xs text-neutral-500 mt-1">Ready for booking</div>
          </div>
        </div>
      )}

      {/* Admin Pending Approval Queue */}
      {isAdmin && (
        <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Pending Booking Requests
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Review and approve or reject seminar hall reservations submitted by
                faculty.
              </p>
            </div>
            <Link
              to="/admin/bookings"
              className="text-xs font-medium text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
            >
              <span>View all bookings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {!data?.pendingBookings || data.pendingBookings.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-neutral-600">No bookings available.</p>
              <p className="text-xs text-neutral-400 mt-1">
                There are currently no pending booking requests awaiting approval.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-medium text-neutral-500">
                    <th className="py-3 px-6">Event</th>
                    <th className="py-3 px-6">Seminar Hall</th>
                    <th className="py-3 px-6">Faculty Organizer</th>
                    <th className="py-3 px-6">Date &amp; Time</th>
                    <th className="py-3 px-6 text-right">Attendees</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-sm">
                  {data.pendingBookings.map((b: any) => (
                    <tr key={b.id} className="hover:bg-neutral-50/60">
                      <td className="py-3.5 px-6 font-medium text-neutral-900">
                        {b.eventName}
                        <div className="text-xs text-neutral-500 font-normal">
                          {b.eventType}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-neutral-700">{b.hallName}</td>
                      <td className="py-3.5 px-6 text-neutral-700">{b.organizerName}</td>
                      <td className="py-3.5 px-6 font-mono text-xs tabular-nums text-neutral-700">
                        {b.bookingDate} · {b.startTime}–{b.endTime}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono tabular-nums text-neutral-700">
                        {b.expectedAttendees}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleQuickBookingAction(b.id, "approved")}
                            className="px-2.5 py-1 text-xs font-medium bg-emerald-700 text-white rounded hover:bg-emerald-800 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleQuickBookingAction(b.id, "rejected")}
                            className="px-2.5 py-1 text-xs font-medium bg-white border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Two-Column Grid: Upcoming Bookings & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                {isAdmin ? "Current & Upcoming Bookings" : "My Upcoming Bookings"}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Scheduled seminar hall events from today onward.
              </p>
            </div>
            <Link
              to={isAdmin ? "/admin/bookings" : "/faculty/bookings"}
              className="text-xs font-medium text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {!data?.upcomingBookings || data.upcomingBookings.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-neutral-600">No bookings available.</p>
              <Link
                to="/bookings/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Booking Request</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-medium text-neutral-500">
                    <th className="py-3 px-6">Event</th>
                    <th className="py-3 px-6">Hall</th>
                    <th className="py-3 px-6">Schedule</th>
                    <th className="py-3 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-sm">
                  {data.upcomingBookings.map((b: any) => (
                    <tr key={b.id} className="hover:bg-neutral-50/60">
                      <td className="py-3.5 px-6 font-medium text-neutral-900">
                        {b.eventName}
                        <div className="text-xs text-neutral-500 font-normal">
                          {b.eventType} · {b.expectedAttendees} attendees
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-neutral-700">{b.hallName}</td>
                      <td className="py-3.5 px-6 font-mono text-xs tabular-nums text-neutral-700">
                        {b.bookingDate}
                        <div className="text-neutral-500">
                          {b.startTime} – {b.endTime}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-xs font-medium">
                        {b.status === "approved" && (
                          <span className="text-emerald-700">Approved</span>
                        )}
                        {b.status === "pending" && (
                          <span className="text-amber-700">Pending</span>
                        )}
                        {b.status === "rejected" && (
                          <span className="text-red-700">Rejected</span>
                        )}
                        {b.status === "cancelled" && (
                          <span className="text-neutral-500">Cancelled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Notifications Panel */}
        <section className="lg:col-span-4 bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900">Recent Notifications</h2>
            <Link
              to="/notifications"
              className="text-xs font-medium text-neutral-700 hover:text-neutral-900"
            >
              All notifications
            </Link>
          </div>

          {!data?.recentNotifications || data.recentNotifications.length === 0 ? (
            <div className="p-8 text-center flex-1 flex flex-col justify-center">
              <p className="text-sm text-neutral-600">No notifications available.</p>
              <p className="text-xs text-neutral-400 mt-1">
                Alerts for booking approvals and maintenance updates will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {data.recentNotifications.map((n: any) => (
                <div
                  key={n.id}
                  className={`p-4 text-xs space-y-1 ${
                    !n.isRead ? "bg-neutral-50/80" : "bg-white"
                  }`}
                >
                  <div className="font-semibold text-neutral-900 flex items-center justify-between gap-2">
                    <span>{n.title}</span>
                    {!n.isRead && (
                      <span className="text-[10px] font-medium text-emerald-700">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-600 leading-relaxed">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
