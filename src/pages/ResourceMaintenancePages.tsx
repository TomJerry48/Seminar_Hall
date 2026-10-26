import React, { useEffect, useState } from "react";
import { Plus, Boxes, Wrench, ShieldAlert, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { apiRequest } from "../services/api.ts";

// 1. Resources & Equipment Management Page
export const ResourcesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "Audio/Visual",
    description: "",
    totalQuantity: 10,
    availableQuantity: 10,
    status: "available",
  });

  const loadResources = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ resources: any[] }>("/resources");
      setResources(res.resources);
    } catch (err: any) {
      setError(err.message || "Failed to load resources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const openCreate = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      category: "Audio/Visual",
      description: "",
      totalQuantity: 5,
      availableQuantity: 5,
      status: "available",
    });
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      description: item.description || "",
      totalQuantity: item.totalQuantity,
      availableQuantity: item.availableQuantity,
      status: item.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingItem) {
        await apiRequest(`/resources/${editingItem.id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      } else {
        await apiRequest("/resources", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setModalOpen(false);
      await loadResources();
    } catch (err: any) {
      setError(err.message || "Failed to save resource.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Resources &amp; Equipment Inventory
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            {isAdmin
              ? "Manage college projectors, microphones, speakers, podiums, and furniture quantities."
              : "View available college audio-visual and seminar hall equipment."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 flex items-center gap-1.5 self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Add Equipment</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-sm text-neutral-500">Loading resources...</div>
      ) : resources.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center space-y-3">
          <Boxes className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900">
            No resources have been added.
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            {isAdmin
              ? "Add audio-visual equipment, microphones, projectors, or seating resources to track inventory."
              : "No college resources have been registered in the database yet."}
          </p>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg"
            >
              Add First Resource
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-medium text-neutral-500">
                <th className="py-3 px-5">Equipment Name</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5 text-right">Available / Total</th>
                <th className="py-3 px-5">Status</th>
                {isAdmin && <th className="py-3 px-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {resources.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50/60">
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-neutral-900">{r.name}</div>
                    {r.description && (
                      <div className="text-xs text-neutral-500">{r.description}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-neutral-700">{r.category}</td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums text-neutral-900">
                    {r.availableQuantity} / {r.totalQuantity}
                  </td>
                  <td className="py-3.5 px-5 text-xs font-semibold capitalize">
                    {r.status === "available" && (
                      <span className="text-emerald-700">Available</span>
                    )}
                    {r.status === "under_maintenance" && (
                      <span className="text-amber-700">Under Maintenance</span>
                    )}
                    {r.status === "unavailable" && (
                      <span className="text-red-700">Unavailable</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => openEdit(r)}
                        className="px-2.5 py-1 text-xs font-medium border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-100"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h2 className="text-base font-bold text-neutral-900">
                {editingItem ? "Edit Equipment" : "Add Equipment Resource"}
              </h2>
              <button onClick={() => setModalOpen(false)}>
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Equipment Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Wireless Collar Microphone"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="Audio/Visual">Audio/Visual</option>
                  <option value="IT Equipment">IT Equipment</option>
                  <option value="Furniture">Furniture &amp; Seating</option>
                  <option value="General">General Facility</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Total Quantity *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.totalQuantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        totalQuantity: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Available Quantity *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={formData.totalQuantity}
                    required
                    value={formData.availableQuantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        availableQuantity: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="available">Available</option>
                  <option value="under_maintenance">Under Maintenance</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional specifications or storage location"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg"
                >
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// 2. Maintenance Requests & Hall Maintenance Blocks Page
export const MaintenancePage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const today = new Date().toISOString().split("T")[0];

  const [requests, setRequests] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Report Maintenance Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    hallId: "",
    resourceId: "",
    title: "",
    issueDescription: "",
    priority: "medium",
  });

  // Create Hall Block Modal (Admin)
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    hallId: "",
    reason: "",
    startDate: today,
    endDate: today,
    startTime: "00:00",
    endTime: "23:59",
  });

  // Update Maintenance Status Modal (Admin)
  const [resolveModal, setResolveModal] = useState<any | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState("resolved");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, bRes, hRes, rRes] = await Promise.all([
        apiRequest<{ maintenanceRequests: any[] }>("/maintenance"),
        apiRequest<{ hallBlocks: any[] }>("/hall-blocks"),
        apiRequest<{ halls: any[] }>("/halls"),
        apiRequest<{ resources: any[] }>("/resources"),
      ]);
      setRequests(mRes.maintenanceRequests);
      setBlocks(bRes.hallBlocks);
      setHalls(hRes.halls);
      setResources(rRes.resources);
    } catch (err: any) {
      setError(err.message || "Failed to load maintenance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest("/maintenance", {
        method: "POST",
        body: JSON.stringify({
          hallId: reportForm.hallId ? Number(reportForm.hallId) : null,
          resourceId: reportForm.resourceId ? Number(reportForm.resourceId) : null,
          title: reportForm.title,
          issueDescription: reportForm.issueDescription,
          priority: reportForm.priority,
        }),
      });
      setReportModalOpen(false);
      setReportForm({
        hallId: "",
        resourceId: "",
        title: "",
        issueDescription: "",
        priority: "medium",
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to submit maintenance report.");
    }
  };

  const handleCreateBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest("/hall-blocks", {
        method: "POST",
        body: JSON.stringify({
          hallId: Number(blockForm.hallId),
          reason: blockForm.reason,
          startDate: blockForm.startDate,
          endDate: blockForm.endDate,
          startTime: blockForm.startTime,
          endTime: blockForm.endTime,
        }),
      });
      setBlockModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create hall maintenance block.");
    }
  };

  const handleToggleBlock = async (id: number, currentActive: boolean) => {
    try {
      await apiRequest(`/hall-blocks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentActive }),
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update block.");
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModal) return;
    try {
      await apiRequest(`/maintenance/${resolveModal.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: resolutionStatus,
          resolutionNotes,
        }),
      });
      setResolveModal(null);
      setResolutionNotes("");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update maintenance status.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Maintenance &amp; Facility Blocks
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            {isAdmin
              ? "Track equipment damage reports, update resolution statuses, and block seminar halls for scheduled maintenance."
              : "Report equipment damage or facility issues in seminar halls and track resolution progress."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => {
                if (halls.length > 0 && !blockForm.hallId) {
                  setBlockForm({ ...blockForm, hallId: String(halls[0].id) });
                }
                setBlockModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-medium border border-neutral-300 bg-white text-neutral-800 rounded-lg hover:bg-neutral-50"
            >
              Block Hall for Maintenance
            </button>
          )}
          <button
            onClick={() => setReportModalOpen(true)}
            className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Issue Report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* Scheduled Hall Maintenance Blocks */}
      <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h2 className="text-base font-bold text-neutral-900">
            Hall Maintenance Blocks
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Halls with active maintenance blocks cannot be booked during the blocked
            date and time window.
          </p>
        </div>
        {blocks.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            No hall maintenance blocks have been scheduled.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-medium text-neutral-500">
                  <th className="py-3 px-5">Seminar Hall</th>
                  <th className="py-3 px-5">Maintenance Reason</th>
                  <th className="py-3 px-5">Blocked Period</th>
                  <th className="py-3 px-5">Status</th>
                  {isAdmin && <th className="py-3 px-5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {blocks.map((blk) => (
                  <tr key={blk.id}>
                    <td className="py-3 px-5 font-medium text-neutral-900">
                      {blk.hallName}
                    </td>
                    <td className="py-3 px-5 text-neutral-700">{blk.reason}</td>
                    <td className="py-3 px-5 font-mono text-xs tabular-nums text-neutral-700">
                      {blk.startDate} ({blk.startTime}) → {blk.endDate} ({blk.endTime})
                    </td>
                    <td className="py-3 px-5 text-xs font-semibold">
                      {blk.isActive ? (
                        <span className="text-amber-700">Active Block</span>
                      ) : (
                        <span className="text-neutral-400">Released</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-5 text-right">
                        <button
                          onClick={() => handleToggleBlock(blk.id, blk.isActive)}
                          className="px-2.5 py-1 text-xs font-medium border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50"
                        >
                          {blk.isActive ? "Release Block" : "Reactivate"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Maintenance & Damage Requests Table */}
      <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h2 className="text-base font-bold text-neutral-900">
            Equipment &amp; Facility Maintenance Requests
          </h2>
        </div>
        {loading ? (
          <div className="p-8 text-sm text-neutral-500">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center text-xs text-neutral-500">
            No maintenance or equipment damage requests have been submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-medium text-neutral-500">
                  <th className="py-3 px-5">Issue &amp; Description</th>
                  <th className="py-3 px-5">Location / Equipment</th>
                  <th className="py-3 px-5">Reported By</th>
                  <th className="py-3 px-5">Priority</th>
                  <th className="py-3 px-5">Status</th>
                  {isAdmin && <th className="py-3 px-5 text-right">Manage</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-neutral-900">{req.title}</div>
                      <div className="text-xs text-neutral-600 mt-0.5">
                        {req.issueDescription}
                      </div>
                      {req.resolutionNotes && (
                        <div className="text-xs text-emerald-800 mt-1">
                          Resolution: {req.resolutionNotes}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-neutral-700">
                      {req.hallName || "General"}
                      {req.resourceName ? ` · ${req.resourceName}` : ""}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-neutral-700">
                      {req.reporterName}
                    </td>
                    <td className="py-3.5 px-5 text-xs font-semibold capitalize">
                      <span
                        className={
                          req.priority === "critical" || req.priority === "high"
                            ? "text-red-700"
                            : req.priority === "medium"
                            ? "text-amber-700"
                            : "text-neutral-600"
                        }
                      >
                        {req.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-xs font-semibold capitalize">
                      {req.status === "resolved" || req.status === "closed" ? (
                        <span className="text-emerald-700">{req.status}</span>
                      ) : (
                        <span className="text-amber-700">
                          {req.status.replace("_", " ")}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => {
                            setResolveModal(req);
                            setResolutionStatus(req.status);
                            setResolutionNotes(req.resolutionNotes || "");
                          }}
                          className="px-2.5 py-1 text-xs font-medium border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50"
                        >
                          Update Status
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Report Issue Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-base font-bold text-neutral-900">
                Report Maintenance or Equipment Issue
              </h3>
              <button onClick={() => setReportModalOpen(false)}>
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <form onSubmit={handleReportSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Issue Summary *
                </label>
                <input
                  type="text"
                  required
                  value={reportForm.title}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, title: e.target.value })
                  }
                  placeholder="Projector lamp flickering / AC unit not cooling"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Seminar Hall
                  </label>
                  <select
                    value={reportForm.hallId}
                    onChange={(e) =>
                      setReportForm({ ...reportForm, hallId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-xs"
                  >
                    <option value="">None / General</option>
                    {halls.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Equipment Resource
                  </label>
                  <select
                    value={reportForm.resourceId}
                    onChange={(e) =>
                      setReportForm({ ...reportForm, resourceId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white text-xs"
                  >
                    <option value="">None / General</option>
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Priority Level
                </label>
                <select
                  value={reportForm.priority}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, priority: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reportForm.issueDescription}
                  onChange={(e) =>
                    setReportForm({
                      ...reportForm,
                      issueDescription: e.target.value,
                    })
                  }
                  placeholder="Describe the exact symptom or damage observed..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Hall Maintenance Block Modal */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-base font-bold text-neutral-900">
                Create Hall Maintenance Block
              </h3>
              <button onClick={() => setBlockModalOpen(false)}>
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            {halls.length === 0 ? (
              <p className="text-xs text-neutral-600">
                No halls have been registered yet. Register a seminar hall first.
              </p>
            ) : (
              <form onSubmit={handleCreateBlockSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Seminar Hall *
                  </label>
                  <select
                    required
                    value={blockForm.hallId}
                    onChange={(e) =>
                      setBlockForm({ ...blockForm, hallId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="">Select hall...</option>
                    {halls.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Maintenance Reason *
                  </label>
                  <input
                    type="text"
                    required
                    value={blockForm.reason}
                    onChange={(e) =>
                      setBlockForm({ ...blockForm, reason: e.target.value })
                    }
                    placeholder="Annual AC servicing and audio calibration"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={blockForm.startDate}
                      onChange={(e) =>
                        setBlockForm({ ...blockForm, startDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={blockForm.endDate}
                      onChange={(e) =>
                        setBlockForm({ ...blockForm, endDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={blockForm.startTime}
                      onChange={(e) =>
                        setBlockForm({ ...blockForm, startTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={blockForm.endTime}
                      onChange={(e) =>
                        setBlockForm({ ...blockForm, endTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setBlockModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium border border-neutral-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg"
                  >
                    Create Block
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Update Maintenance Request Status Modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleResolveSubmit}
            className="bg-white border border-neutral-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-lg text-sm"
          >
            <h3 className="text-base font-bold text-neutral-900">
              Update Maintenance Request
            </h3>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Status
              </label>
              <select
                value={resolutionStatus}
                onChange={(e) => setResolutionStatus(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Resolution Details / Technician Notes
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Replaced HDMI cable and tested projector output..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolveModal(null)}
                className="px-4 py-2 text-xs font-medium border border-neutral-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg"
              >
                Save Update
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
