import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarPlus,
  Check,
  Edit3,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { apiRequest } from "../services/api.ts";

export const HallsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [halls, setHalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state for Create / Edit Hall
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHall, setEditingHall] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    building: "",
    floor: "Ground Floor",
    capacity: 120,
    description: "",
    hasAc: true,
    hasProjector: true,
    hasSoundSystem: true,
    requiresApproval: true,
    isActive: true,
  });

  const loadHalls = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ halls: any[] }>("/halls");
      setHalls(res.halls);
    } catch (err: any) {
      setError(err.message || "Failed to load seminar halls.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHalls();
  }, []);

  const openCreateModal = () => {
    setEditingHall(null);
    setFormData({
      name: "",
      code: "",
      building: "Main Academic Block",
      floor: "Ground Floor",
      capacity: 150,
      description: "",
      hasAc: true,
      hasProjector: true,
      hasSoundSystem: true,
      requiresApproval: true,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (hall: any) => {
    setEditingHall(hall);
    setFormData({
      name: hall.name,
      code: hall.code,
      building: hall.building,
      floor: hall.floor || "Ground Floor",
      capacity: hall.capacity,
      description: hall.description || "",
      hasAc: hall.hasAc,
      hasProjector: hall.hasProjector,
      hasSoundSystem: hall.hasSoundSystem,
      requiresApproval: hall.requiresApproval,
      isActive: hall.isActive,
    });
    setModalOpen(true);
  };

  const handleSaveHall = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    try {
      if (editingHall) {
        await apiRequest(`/halls/${editingHall.id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
        setSuccessMsg(`Seminar hall "${formData.name}" updated successfully.`);
      } else {
        await apiRequest("/halls", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        setSuccessMsg(`Seminar hall "${formData.name}" registered successfully.`);
      }
      setModalOpen(false);
      await loadHalls();
    } catch (err: any) {
      setError(err.message || "Failed to save seminar hall.");
    }
  };

  const handleToggleActive = async (hall: any) => {
    try {
      await apiRequest(`/halls/${hall.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !hall.isActive }),
      });
      await loadHalls();
    } catch (err: any) {
      setError(err.message || "Failed to update hall status.");
    }
  };
  
const handleDeleteHall = async (hall: any) => {
  const confirmed = window.confirm(
    `Are you sure you want to permanently delete "${hall.name}"?`
  );

  if (!confirmed) return;

  setError(null);

  try {
    await apiRequest(`/halls/${hall.id}`, {
      method: "DELETE",
    });

    await loadHalls();
    alert(`"${hall.name}" deleted successfully.`);
  } catch (err: any) {
    setError(err.message || "Failed to delete seminar hall.");
  }
};


  const filteredHalls = halls.filter(
    (h) =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.building.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Seminar Halls &amp; Auditoriums
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            {isAdmin
              ? "Register, configure, and manage SSMIET seminar halls, seating capacities, and assigned equipment."
              : "Browse SSMIET seminar halls, capacities, and available audio-visual facilities."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Hall</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 flex items-center justify-between">
          <span>{successMsg}</span>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter halls by name, code, or building..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900"
          />
        </div>
        <div className="text-xs text-neutral-500 font-mono tabular-nums">
          Showing {filteredHalls.length} of {halls.length} hall(s)
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-52 bg-white border border-neutral-200 rounded-xl p-6 animate-pulse"
            />
          ))}
        </div>
      ) : filteredHalls.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center space-y-3">
          <Building2 className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900">
            No halls have been registered yet.
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            {isAdmin
              ? "Click the button below to register the first seminar hall or auditorium in PostgreSQL."
              : "An administrator must register seminar halls before they can be booked."}
          </p>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
            >
              <Plus className="w-4 h-4" />
              <span>Register First Seminar Hall</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHalls.map((hall) => (
            <div
              key={hall.id}
              className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col justify-between hover:border-neutral-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">
                      {hall.name}
                    </h3>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      <span className="font-mono">{hall.code}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{hall.building}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{hall.floor}</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      hall.isActive ? "text-emerald-700" : "text-neutral-400"
                    }`}
                  >
                    {hall.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {hall.description && (
                  <p className="text-xs text-neutral-600 line-clamp-2">
                    {hall.description}
                  </p>
                )}

                <div className="pt-2 border-t border-neutral-100 text-xs text-neutral-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Seating Capacity</span>
                    <span className="font-mono tabular-nums font-semibold text-neutral-900">
                      {hall.capacity} seats
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Standard Facilities</span>
                    <span className="text-neutral-800">
                      {[
                        hall.hasAc ? "AC" : null,
                        hall.hasProjector ? "Projector" : null,
                        hall.hasSoundSystem ? "Sound System" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Standard"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Booking Workflow</span>
                    <span className="text-neutral-700">
                      {hall.requiresApproval ? "Admin Approval" : "Instant Allotment"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-neutral-200 flex items-center justify-between gap-2">
                <Link
                  to={`/halls/${hall.id}`}
                  className="text-xs font-semibold text-neutral-900 hover:underline"
                >
                  View Hall Details
                </Link>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEditModal(hall)}
                        className="px-2.5 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(hall)}
                        className="px-2.5 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
                      >
                        {hall.isActive ? "Deactivate" : "Activate"}
                      </button>
                      
<button
  onClick={() => handleDeleteHall(hall)}
  className="px-2.5 py-1.5 text-xs font-medium border border-red-200 rounded-lg text-red-700 hover:bg-red-50 transition-colors"
>
  Delete
</button>

                    </>
                  )}
                  {hall.isActive && (
                    <Link
                      to={`/bookings/new?hallId=${hall.id}`}
                      className="px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
                    >
                      Book
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Hall Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h2 className="text-lg font-bold text-neutral-900">
                {editingHall ? "Update Seminar Hall" : "Register Seminar Hall"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHall} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Hall Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Dr. A.P.J. Abdul Kalam Auditorium"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Hall Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="SH-101"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Building / Block *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.building}
                    onChange={(e) =>
                      setFormData({ ...formData, building: e.target.value })
                    }
                    placeholder="Admin Block"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Floor
                  </label>
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    placeholder="First Floor"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Seating Capacity *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Description &amp; Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Acoustic seminar hall suitable for symposiums, guest lectures, and faculty development programs."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200 text-xs">
                <label className="flex items-center gap-2 text-neutral-800">
                  <input
                    type="checkbox"
                    checked={formData.hasAc}
                    onChange={(e) =>
                      setFormData({ ...formData, hasAc: e.target.checked })
                    }
                  />
                  <span>Air Conditioning (AC)</span>
                </label>

                <label className="flex items-center gap-2 text-neutral-800">
                  <input
                    type="checkbox"
                    checked={formData.hasProjector}
                    onChange={(e) =>
                      setFormData({ ...formData, hasProjector: e.target.checked })
                    }
                  />
                  <span>HD Projector</span>
                </label>

                <label className="flex items-center gap-2 text-neutral-800">
                  <input
                    type="checkbox"
                    checked={formData.hasSoundSystem}
                    onChange={(e) =>
                      setFormData({ ...formData, hasSoundSystem: e.target.checked })
                    }
                  />
                  <span>PA Sound System</span>
                </label>

                <label className="flex items-center gap-2 text-neutral-800">
                  <input
                    type="checkbox"
                    checked={formData.requiresApproval}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiresApproval: e.target.checked,
                      })
                    }
                  />
                  <span>Requires Admin Approval</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
                >
                  {editingHall ? "Save Changes" : "Register Hall"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Detailed Single Hall View (Hall Details, Associated Resources, Hall Bookings, Maintenance Blocks)
export const HallDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [hall, setHall] = useState<any | null>(null);
  const [allResources, setAllResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [assignQty, setAssignQty] = useState<number>(1);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hallRes, resList] = await Promise.all([
        apiRequest<{ hall: any }>(`/halls/${id}`),
        apiRequest<{ resources: any[] }>("/resources"),
      ]);
      setHall(hallRes.hall);
      setAllResources(resList.resources);
    } catch (err: any) {
      setError(err.message || "Failed to load hall details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const handleAssignResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceId) return;
    try {
      await apiRequest(`/halls/${id}/resources`, {
        method: "POST",
        body: JSON.stringify({
          resourceId: Number(selectedResourceId),
          quantity: assignQty,
        }),
      });
      setSelectedResourceId("");
      setAssignQty(1);
      await loadDetails();
    } catch (err: any) {
      setError(err.message || "Failed to assign resource.");
    }
  };

  const handleRemoveResource = async (resourceId: number) => {
    try {
      await apiRequest(`/halls/${id}/resources/${resourceId}`, {
        method: "DELETE",
      });
      await loadDetails();
    } catch (err: any) {
      setError(err.message || "Failed to remove resource.");
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-neutral-500">Loading hall details...</div>;
  }

  if (error || !hall) {
    return (
      <div className="p-6 bg-white border border-red-200 rounded-xl text-sm text-red-800">
        {error || "Seminar hall not found."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <Link
            to={isAdmin ? "/admin/halls" : "/halls"}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Seminar Halls</span>
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900">{hall.name}</h1>
          <div className="text-xs text-neutral-500 mt-1">
            <span className="font-mono">{hall.code}</span> · {hall.building} ·{" "}
            {hall.floor} · Capacity:{" "}
            <span className="font-mono font-semibold text-neutral-900">
              {hall.capacity} seats
            </span>
          </div>
        </div>
        {hall.isActive && (
          <Link
            to={`/bookings/new?hallId=${hall.id}`}
            className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 inline-flex items-center gap-1.5"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Book This Hall</span>
          </Link>
        )}
      </div>

      {/* Assigned Equipment & Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-neutral-900">
            Assigned Hall Equipment
          </h2>
          {hall.resources && hall.resources.length > 0 ? (
            <div className="divide-y divide-neutral-200 text-sm">
              {hall.resources.map((r: any) => (
                <div
                  key={r.id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-medium text-neutral-900">
                      {r.resourceName}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {r.category} · Qty: <span className="font-mono">{r.quantity}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveResource(r.resourceId)}
                      className="text-xs text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              No resources have been associated with this hall yet.
            </p>
          )}

          {isAdmin && (
            <form
              onSubmit={handleAssignResource}
              className="pt-4 border-t border-neutral-200 space-y-3"
            >
              <div className="text-xs font-semibold text-neutral-800">
                Associate Resource with Hall
              </div>
              {allResources.length === 0 ? (
                <p className="text-xs text-neutral-500">
                  No resources have been added.{" "}
                  <Link to="/admin/resources" className="underline text-neutral-900">
                    Add resources first
                  </Link>
                  .
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedResourceId}
                    onChange={(e) => setSelectedResourceId(e.target.value)}
                    required
                    className="flex-1 px-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="">Select equipment...</option>
                    {allResources.map((resItem) => (
                      <option key={resItem.id} value={resItem.id}>
                        {resItem.name} ({resItem.category})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={assignQty}
                    onChange={(e) => setAssignQty(Number(e.target.value))}
                    className="w-16 px-2 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg"
                  >
                    Assign
                  </button>
                </div>
              )}
            </form>
          )}
        </section>

        {/* Hall Bookings & Maintenance Blocks */}
        <section className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              Active Maintenance Blocks
            </h2>
            {!hall.blocks || hall.blocks.length === 0 ? (
              <p className="text-xs text-neutral-500 mt-2">
                No active maintenance blocks for this hall.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {hall.blocks.map((blk: any) => (
                  <div
                    key={blk.id}
                    className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-xs text-amber-900 flex items-center justify-between"
                  >
                    <span>
                      <strong>{blk.reason}</strong>
                    </span>
                    <span className="font-mono">
                      {blk.startDate} ({blk.startTime}) → {blk.endDate} ({blk.endTime})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-200">
            <h2 className="text-base font-bold text-neutral-900 mb-3">
              Hall Booking Schedule
            </h2>
            {!hall.bookings || hall.bookings.length === 0 ? (
              <p className="text-xs text-neutral-500">No bookings available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500">
                      <th className="py-2 pr-4">Date &amp; Time</th>
                      <th className="py-2 pr-4">Event</th>
                      <th className="py-2 pr-4">Organizer</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {hall.bookings.map((b: any) => (
                      <tr key={b.id}>
                        <td className="py-2.5 pr-4 font-mono tabular-nums text-neutral-700">
                          {b.bookingDate} · {b.startTime}–{b.endTime}
                        </td>
                        <td className="py-2.5 pr-4 font-medium text-neutral-900">
                          {b.eventName}
                        </td>
                        <td className="py-2.5 pr-4 text-neutral-600">
                          {b.organizerName}
                        </td>
                        <td className="py-2.5 capitalize font-medium">
                          {b.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
