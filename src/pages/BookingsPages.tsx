import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { apiRequest } from "../services/api.ts";

// 1. Hall Availability Search Page
export const AvailabilitySearchPage: React.FC = () => {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("09:30");
  const [endTime, setEndTime] = useState("12:30");
  const [minCapacity, setMinCapacity] = useState<string>("");
  const [requireAc, setRequireAc] = useState(false);
  const [requireProjector, setRequireProjector] = useState(false);
  const [requireSound, setRequireSound] = useState(false);

  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (endTime <= startTime) {
      setError("End time must be later than the start time.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date,
        startTime,
        endTime,
        ...(minCapacity ? { minCapacity } : {}),
        requireAc: String(requireAc),
        requireProjector: String(requireProjector),
        requireSound: String(requireSound),
      });
      const res = await apiRequest<{ halls: any[] }>(
        `/halls/availability?${params.toString()}`
      );
      setResults(res.halls);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || "Failed to check hall availability.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch();
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-5">
        <h1 className="text-2xl font-bold text-neutral-900">
          Hall Availability Search
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Verify real-time seminar hall availability by date, time slot, seating
          capacity, and audio-visual facilities.
        </p>
      </div>

      {/* Filter Form */}
      <form
        onSubmit={runSearch}
        className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Start Time *
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              End Time *
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Minimum Capacity
            </label>
            <input
              type="number"
              min={1}
              value={minCapacity}
              onChange={(e) => setMinCapacity(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-neutral-200">
          <div className="flex flex-wrap items-center gap-5 text-xs text-neutral-800">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requireAc}
                onChange={(e) => setRequireAc(e.target.checked)}
              />
              <span>Air Conditioning</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requireProjector}
                onChange={(e) => setRequireProjector(e.target.checked)}
              />
              <span>HD Projector</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requireSound}
                onChange={(e) => setRequireSound(e.target.checked)}
              />
              <span>PA Sound System</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{loading ? "Checking..." : "Check Availability"}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800">
          {error}
        </div>
      )}

      {searched && !loading && results.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center space-y-2">
          <h3 className="text-base font-bold text-neutral-900">
            No halls have been registered yet.
          </h3>
          <p className="text-xs text-neutral-500">
            Once seminar halls are registered by the administrator, their real-time
            availability will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((hall) => (
            <div
              key={hall.id}
              className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">
                      {hall.name}
                    </h3>
                    <div className="text-xs text-neutral-500">
                      <span className="font-mono">{hall.code}</span> · {hall.building}
                    </div>
                  </div>
                  {hall.isAvailable ? (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Available</span>
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-red-700 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Unavailable</span>
                    </span>
                  )}
                </div>

                <div className="text-xs text-neutral-600 space-y-1 pt-2 border-t border-neutral-100">
                  <div>
                    Capacity:{" "}
                    <strong className="font-mono text-neutral-900">
                      {hall.capacity} seats
                    </strong>
                  </div>
                  <div>
                    Facilities:{" "}
                    {[
                      hall.hasAc ? "AC" : null,
                      hall.hasProjector ? "Projector" : null,
                      hall.hasSoundSystem ? "Sound System" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Standard"}
                  </div>
                </div>

                {!hall.isAvailable && hall.unavailabilityReason && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                    {hall.unavailabilityReason}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-neutral-200 flex items-center justify-between">
                <Link
                  to={`/halls/${hall.id}`}
                  className="text-xs font-medium text-neutral-700 hover:underline"
                >
                  Hall Details
                </Link>
                {hall.isAvailable && (
                  <Link
                    to={`/bookings/new?hallId=${hall.id}&date=${date}&startTime=${startTime}&endTime=${endTime}`}
                    className="px-3.5 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
                  >
                    Proceed to Book
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 2. Create Booking Page
export const CreateBookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const today = new Date().toISOString().split("T")[0];
  const [halls, setHalls] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hallId, setHallId] = useState<string>(searchParams.get("hallId") || "");
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("Seminar");
  const [eventDescription, setEventDescription] = useState("");
  const [expectedAttendees, setExpectedAttendees] = useState<number>(
    Number(searchParams.get("attendees")) || 60
  );
  const [bookingDate, setBookingDate] = useState(
    searchParams.get("date") || today
  );
  const [startTime, setStartTime] = useState(
    searchParams.get("startTime") || "09:30"
  );
  const [endTime, setEndTime] = useState(
    searchParams.get("endTime") || "12:30"
  );
  const [requiredResourcesNotes, setRequiredResourcesNotes] = useState("");
  const [selectedResourceQtys, setSelectedResourceQtys] = useState<
    Record<number, number>
  >({});

  useEffect(() => {
    Promise.all([
      apiRequest<{ halls: any[] }>("/halls"),
      apiRequest<{ resources: any[] }>("/resources"),
    ])
      .then(([hRes, rRes]) => {
        const active = hRes.halls.filter((h) => h.isActive);
        setHalls(active);
        if (!hallId && active.length > 0) {
          setHallId(String(active[0].id));
        }
        setResources(rRes.resources.filter((r) => r.status === "available"));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedHallObj = halls.find((h) => String(h.id) === String(hallId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hallId) {
      setError("Please select a seminar hall.");
      return;
    }
    if (endTime <= startTime) {
      setError("Booking end time must be later than start time.");
      return;
    }
    if (selectedHallObj && expectedAttendees > selectedHallObj.capacity) {
      setError(
        `Expected attendees (${expectedAttendees}) cannot exceed ${selectedHallObj.name}'s capacity (${selectedHallObj.capacity}).`
      );
      return;
    }

    const requestedResources = Object.entries(selectedResourceQtys)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([resId, qty]) => ({
        resourceId: Number(resId),
        quantity: Number(qty),
      }));

    setSubmitting(true);
    try {
      await apiRequest("/bookings", {
        method: "POST",
        body: JSON.stringify({
          hallId: Number(hallId),
          eventName,
          eventType,
          eventDescription,
          expectedAttendees,
          bookingDate,
          startTime,
          endTime,
          requiredResourcesNotes,
          requestedResources,
        }),
      });
      navigate(user?.role === "admin" ? "/admin/bookings" : "/faculty/bookings");
    } catch (err: any) {
      setError(err.message || "Failed to create booking.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-neutral-500">Loading booking form...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b border-neutral-200 pb-5">
        <h1 className="text-2xl font-bold text-neutral-900">
          Create Seminar Hall Booking
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Submit a verified reservation request. Double bookings, maintenance blocks,
          and capacity limits are strictly validated in PostgreSQL.
        </p>
      </div>

      {halls.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center space-y-3">
          <h3 className="text-base font-bold text-neutral-900">
            No halls have been registered yet.
          </h3>
          <p className="text-xs text-neutral-500">
            An administrator must register active seminar halls before bookings can be
            created.
          </p>
          {user?.role === "admin" && (
            <Link
              to="/admin/halls"
              className="inline-block px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg"
            >
              Register Seminar Hall
            </Link>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 space-y-6"
        >
          {error && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Select Seminar Hall *
              </label>
              <select
                required
                value={hallId}
                onChange={(e) => setHallId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg bg-white"
              >
                {halls.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.code}) — {h.building} · Max Capacity: {h.capacity}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. National Level Technical Symposium / IEEE Guest Lecture"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Event Category *
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
              >
                <option value="Seminar">Seminar</option>
                <option value="Guest Lecture">Guest Lecture</option>
                <option value="Workshop">Workshop / Hands-on Training</option>
                <option value="Department Meeting">Department / Faculty Meeting</option>
                <option value="Conference">Symposium / Conference</option>
                <option value="Placement Drive">Placement &amp; Career Drive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Expected Attendees *{" "}
                {selectedHallObj && (
                  <span className="text-neutral-500 font-normal">
                    (Max: {selectedHallObj.capacity})
                  </span>
                )}
              </label>
              <input
                type="number"
                required
                min={1}
                max={selectedHallObj?.capacity || 5000}
                value={expectedAttendees}
                onChange={(e) => setExpectedAttendees(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Booking Date *
              </label>
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Event Description &amp; Chief Guest Details
            </label>
            <textarea
              rows={3}
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              placeholder="Provide agenda, speaker details, and participating student year/department..."
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
            />
          </div>

          {resources.length > 0 && (
            <div className="pt-4 border-t border-neutral-200 space-y-3">
              <div className="text-xs font-semibold text-neutral-900">
                Request Additional College Equipment (Optional)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resources.map((resItem) => (
                  <div
                    key={resItem.id}
                    className="p-3 border border-neutral-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-medium text-neutral-900">
                        {resItem.name}
                      </div>
                      <div className="text-neutral-500">
                        Available: {resItem.availableQuantity}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={resItem.availableQuantity}
                      value={selectedResourceQtys[resItem.id] || 0}
                      onChange={(e) =>
                        setSelectedResourceQtys({
                          ...selectedResourceQtys,
                          [resItem.id]: Number(e.target.value),
                        })
                      }
                      className="w-16 px-2 py-1 border border-neutral-300 rounded bg-white font-mono text-right"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Special Arrangement / Resource Notes
            </label>
            <input
              type="text"
              value={requiredResourcesNotes}
              onChange={(e) => setRequiredResourcesNotes(e.target.value)}
              placeholder="e.g. Require 2 wireless collar microphones and podium arrangement"
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-xs font-medium border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50"
            >
              {submitting ? "Validating & Submitting..." : "Submit Booking Request"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// 3. Bookings Management Page (Admin All Bookings / Faculty My Bookings)
export const BookingsListPage: React.FC<{ myOnly?: boolean }> = ({
  myOnly = false,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" && !myOnly;
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remarksModal, setRemarksModal] = useState<{
    bookingId: number;
    targetStatus: "approved" | "rejected" | "cancelled";
    eventName: string;
  } | null>(null);
  const [remarksText, setRemarksText] = useState("");

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ bookings: any[] }>(
        `/bookings?myOnly=${myOnly ? "true" : "false"}`
      );
      setBookingsList(res.bookings);
    } catch (err: any) {
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [myOnly]);

  const handleConfirmStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarksModal) return;
    try {
      await apiRequest(`/bookings/${remarksModal.bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: remarksModal.targetStatus,
          remarks: remarksText,
        }),
      });
      setRemarksModal(null);
      setRemarksText("");
      await loadBookings();
    } catch (err: any) {
      setError(err.message || "Failed to update booking.");
    }
  };

  const filtered = bookingsList.filter(
    (b) => statusFilter === "all" || b.status === statusFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {myOnly ? "My Seminar Hall Bookings" : "All Hall Bookings Management"}
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            {myOnly
              ? "View and manage your seminar hall booking requests and reservations."
              : "Review, approve, reject, or cancel seminar hall bookings across all departments."}
          </p>
        </div>
        <Link
          to="/bookings/new"
          className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 self-start"
        >
          Create Booking
        </Link>
      </div>

      {/* Interactive Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
          {["all", "pending", "approved", "rejected", "cancelled"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                statusFilter === st
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="text-xs font-mono tabular-nums text-neutral-500">
          {filtered.length} record(s)
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-sm text-neutral-500">Loading bookings...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center space-y-3">
          <h3 className="text-base font-bold text-neutral-900">
            No bookings available.
          </h3>
          <p className="text-xs text-neutral-500">
            No booking records match the selected status filter in PostgreSQL.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-medium text-neutral-500">
                  <th className="py-3 px-5">Event Details</th>
                  <th className="py-3 px-5">Seminar Hall</th>
                  <th className="py-3 px-5">Organizer</th>
                  <th className="py-3 px-5">Schedule</th>
                  <th className="py-3 px-5 text-right">Attendees</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-50/60">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-neutral-900">
                        {b.eventName}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {b.eventType}
                        {b.requiredResourcesNotes
                          ? ` · Notes: ${b.requiredResourcesNotes}`
                          : ""}
                      </div>
                      {b.adminRemarks && (
                        <div className="text-xs text-neutral-600 mt-1">
                          Remarks: {b.adminRemarks}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-neutral-800">
                      {b.hallName}
                      <div className="text-xs text-neutral-500">{b.building}</div>
                    </td>
                    <td className="py-3.5 px-5 text-neutral-700">
                      {b.organizerName}
                      <div className="text-xs text-neutral-500">
                        {b.departmentName || b.organizerEmail}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs tabular-nums text-neutral-800">
                      {b.bookingDate}
                      <div className="text-neutral-500">
                        {b.startTime} – {b.endTime}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums text-neutral-800">
                      {b.expectedAttendees}
                    </td>
                    <td className="py-3.5 px-5 text-xs font-semibold capitalize">
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
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {isAdmin && b.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                setRemarksModal({
                                  bookingId: b.id,
                                  targetStatus: "approved",
                                  eventName: b.eventName,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-medium bg-emerald-700 text-white rounded hover:bg-emerald-800"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                setRemarksModal({
                                  bookingId: b.id,
                                  targetStatus: "rejected",
                                  eventName: b.eventName,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-medium border border-red-300 text-red-700 rounded hover:bg-red-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(isAdmin || b.userId === user?.id) &&
                          (b.status === "pending" || b.status === "approved") && (
                            <button
                              onClick={() =>
                                setRemarksModal({
                                  bookingId: b.id,
                                  targetStatus: "cancelled",
                                  eventName: b.eventName,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-medium border border-neutral-300 text-neutral-700 rounded hover:bg-neutral-100"
                            >
                              Cancel
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation & Remarks Modal */}
      {remarksModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmStatusUpdate}
            className="bg-white border border-neutral-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-lg"
          >
            <h3 className="text-base font-bold text-neutral-900 capitalize">
              Confirm Booking {remarksModal.targetStatus}
            </h3>
            <p className="text-xs text-neutral-600">
              Event: <strong>{remarksModal.eventName}</strong>
            </p>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Remarks / Reason (Optional)
              </label>
              <textarea
                rows={3}
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
                placeholder="Enter remarks for booking history and notification..."
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRemarksModal(null);
                  setRemarksText("");
                }}
                className="px-3.5 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg text-neutral-700"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg capitalize"
              >
                Confirm {remarksModal.targetStatus}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// 4. Booking History Page
export const BookingHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ history: any[] }>(
      `/bookings/history?all=${user?.role === "admin" ? "true" : "false"}`
    )
      .then((res) => setHistory(res.history))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-5">
        <h1 className="text-2xl font-bold text-neutral-900">
          Booking Status History
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Chronological log of booking creations, approvals, rejections, and
          cancellations.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-sm text-neutral-500">Loading booking history...</div>
      ) : history.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <h3 className="text-base font-bold text-neutral-900">
            No bookings available.
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Booking status changes will be recorded here automatically.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-medium text-neutral-500">
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5">Event &amp; Hall</th>
                <th className="py-3 px-5">Transition</th>
                <th className="py-3 px-5">Actor</th>
                <th className="py-3 px-5">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="py-3 px-5 font-mono text-xs tabular-nums text-neutral-600">
                    {new Date(h.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-5">
                    <div className="font-medium text-neutral-900">{h.eventName}</div>
                    <div className="text-xs text-neutral-500">
                      {h.hallName} · {h.bookingDate} ({h.startTime}–{h.endTime})
                    </div>
                  </td>
                  <td className="py-3 px-5 text-xs font-medium capitalize">
                    {h.previousStatus ? `${h.previousStatus} → ` : ""}
                    <span className="text-neutral-900 font-semibold">
                      {h.newStatus}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-xs text-neutral-700">
                    {h.actorName} ({h.actorRole})
                  </td>
                  <td className="py-3 px-5 text-xs text-neutral-600">
                    {h.remarks || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// 5. Smart Hall Allotment Recommender Page
export const RecommendationsPage: React.FC = () => {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [expectedAttendees, setExpectedAttendees] = useState(80);
  const [requireAc, setRequireAc] = useState(true);
  const [requireProjector, setRequireProjector] = useState(true);
  const [requireSound, setRequireSound] = useState(true);

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [unavailable, setUnavailable] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiRequest<{
        recommendations: any[];
        unavailableHalls: any[];
      }>("/recommendations", {
        method: "POST",
        body: JSON.stringify({
          date,
          startTime,
          endTime,
          expectedAttendees,
          requireAc,
          requireProjector,
          requireSound,
        }),
      });
      setRecommendations(res.recommendations);
      setUnavailable(res.unavailableHalls);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate recommendations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-5">
        <h1 className="text-2xl font-bold text-neutral-900">
          Smart Hall Allotment Recommender
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Rule-based optimization engine that ranks available SSMIET seminar halls
          by seating efficiency, facility match, and live PostgreSQL schedule
          availability.
        </p>
      </div>

      <form
        onSubmit={handleRecommend}
        className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Event Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Start Time *
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              End Time *
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Expected Attendees *
            </label>
            <input
              type="number"
              required
              min={1}
              value={expectedAttendees}
              onChange={(e) => setExpectedAttendees(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-neutral-200">
          <div className="flex flex-wrap items-center gap-5 text-xs text-neutral-800">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requireAc}
                onChange={(e) => setRequireAc(e.target.checked)}
              />
              <span>Require AC</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requireProjector}
                onChange={(e) => setRequireProjector(e.target.checked)}
              />
              <span>Require Projector</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requireSound}
                onChange={(e) => setRequireSound(e.target.checked)}
              />
              <span>Require Sound System</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? "Evaluating Halls..." : "Find Optimal Hall"}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800">
          {error}
        </div>
      )}

      {searched && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-neutral-900">
            Recommended Seminar Halls ({recommendations.length})
          </h2>
          {recommendations.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center">
              <p className="text-sm font-medium text-neutral-800">
                No matching available halls found for these exact criteria.
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {unavailable.length === 0
                  ? "No halls have been registered yet."
                  : "Try adjusting your time slot, capacity, or facility filters."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec, idx) => (
                <div
                  key={rec.id}
                  className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-700">
                        Rank #{idx + 1} · Suitability Score:{" "}
                        <span className="font-mono">{rec.matchScore}%</span>
                      </span>
                      <span className="text-xs font-mono text-neutral-600">
                        Capacity: {rec.capacity}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900">
                      {rec.name} ({rec.code})
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {rec.reasoning}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-neutral-200 flex justify-end">
                    <Link
                      to={`/bookings/new?hallId=${rec.id}&date=${date}&startTime=${startTime}&endTime=${endTime}&attendees=${expectedAttendees}`}
                      className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
                    >
                      Book Recommended Hall
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
