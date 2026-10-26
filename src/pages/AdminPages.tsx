import React, { useEffect, useState } from "react";
import { Plus, Users, FolderKanban, FileBarChart, ShieldAlert, X } from "lucide-react";
import { apiRequest } from "../services/api.ts";

// 1. Faculty & User Accounts Management Page (Admin)
export const FacultyManagementPage: React.FC = () => {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "faculty",
    departmentId: "",
    designation: "Assistant Professor",
    phone: "",
    accountStatus: "active",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, dRes] = await Promise.all([
        apiRequest<{ users: any[] }>("/users"),
        apiRequest<{ departments: any[] }>("/departments"),
      ]);
      setUsersList(uRes.users);
      setDepartments(dRes.departments);
    } catch (err: any) {
      setError(err.message || "Failed to load faculty accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setFormData({
      fullName: "",
      email: "",
      password: "",
      role: "faculty",
      departmentId: departments[0]?.id ? String(departments[0].id) : "",
      designation: "Assistant Professor",
      phone: "",
      accountStatus: "active",
    });
    setModalOpen(true);
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    setFormData({
      fullName: u.fullName,
      email: u.email,
      password: "",
      role: u.role,
      departmentId: u.departmentId ? String(u.departmentId) : "",
      designation: u.designation || "",
      phone: u.phone || "",
      accountStatus: u.accountStatus,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingUser) {
        await apiRequest(`/users/${editingUser.id}`, {
          method: "PUT",
          body: JSON.stringify({
            ...formData,
            departmentId: formData.departmentId ? Number(formData.departmentId) : null,
            password: formData.password || undefined,
          }),
        });
      } else {
        await apiRequest("/users", {
          method: "POST",
          body: JSON.stringify({
            ...formData,
            departmentId: formData.departmentId ? Number(formData.departmentId) : null,
          }),
        });
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save user account.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Faculty &amp; User Management
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Create and manage SSMIET faculty accounts, department assignments, and
            access permissions.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Create Faculty Account</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-sm text-neutral-500">Loading user accounts...</div>
      ) : usersList.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <p className="text-sm text-neutral-600">No faculty accounts registered.</p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-medium text-neutral-500">
                <th className="py-3 px-5">Full Name &amp; Email</th>
                <th className="py-3 px-5">Role</th>
                <th className="py-3 px-5">Department</th>
                <th className="py-3 px-5">Designation</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50/60">
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-neutral-900">{u.fullName}</div>
                    <div className="text-xs text-neutral-500">{u.email}</div>
                  </td>
                  <td className="py-3.5 px-5 capitalize text-xs font-medium">
                    {u.role}
                  </td>
                  <td className="py-3.5 px-5 text-xs text-neutral-700">
                    {u.departmentName
                      ? `${u.departmentName} (${u.departmentCode})`
                      : "—"}
                  </td>
                  <td className="py-3.5 px-5 text-xs text-neutral-700">
                    {u.designation || "—"}
                  </td>
                  <td className="py-3.5 px-5 text-xs font-semibold capitalize">
                    {u.accountStatus === "active" ? (
                      <span className="text-emerald-700">Active</span>
                    ) : (
                      <span className="text-red-700">{u.accountStatus}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => openEdit(u)}
                      className="px-2.5 py-1 text-xs font-medium border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-100"
                    >
                      Edit
                    </button>
                  </td>
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
              <h3 className="text-base font-bold text-neutral-900">
                {editingUser ? "Edit User Account" : "Create Faculty Account"}
              </h3>
              <button onClick={() => setModalOpen(false)}>
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="Dr. M. Senthil Kumar"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="senthil@ssmiet.ac.in"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {editingUser
                    ? "Reset Password (leave blank to keep existing)"
                    : "Initial Password (min 8 chars) *"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  minLength={8}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="faculty">Faculty</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Account Status
                  </label>
                  <select
                    value={formData.accountStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, accountStatus: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Department
                </label>
                <select
                  value={formData.departmentId}
                  onChange={(e) =>
                    setFormData({ ...formData, departmentId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="">Unassigned</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) =>
                    setFormData({ ...formData, designation: e.target.value })
                  }
                  placeholder="Associate Professor / HOD"
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
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// 2. Department Management Page (Admin)
export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    headOfDepartment: "",
    description: "",
  });

  const loadDepts = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ departments: any[] }>("/departments");
      setDepartments(res.departments);
    } catch (err: any) {
      setError(err.message || "Failed to load departments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingDept) {
        await apiRequest(`/departments/${editingDept.id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      } else {
        await apiRequest("/departments", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setModalOpen(false);
      await loadDepts();
    } catch (err: any) {
      setError(err.message || "Failed to save department.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Academic Departments
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Manage SSMIET engineering and science departments.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingDept(null);
            setFormData({
              name: "",
              code: "",
              headOfDepartment: "",
              description: "",
            });
            setModalOpen(true);
          }}
          className="px-4 py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-sm text-neutral-500">Loading departments...</div>
      ) : departments.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center space-y-3">
          <FolderKanban className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900">
            No departments have been registered yet.
          </h3>
          <p className="text-xs text-neutral-500">
            Add academic departments (e.g., CSE, ECE, AI&amp;DS, Mechanical, Civil) to
            organize faculty accounts.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-medium text-neutral-500">
                <th className="py-3 px-5">Code</th>
                <th className="py-3 px-5">Department Name</th>
                <th className="py-3 px-5">Head of Department</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {departments.map((d) => (
                <tr key={d.id}>
                  <td className="py-3.5 px-5 font-mono font-semibold text-neutral-900">
                    {d.code}
                  </td>
                  <td className="py-3.5 px-5 font-medium text-neutral-900">
                    {d.name}
                    {d.description && (
                      <div className="text-xs text-neutral-500 font-normal">
                        {d.description}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-neutral-700">
                    {d.headOfDepartment || "—"}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => {
                        setEditingDept(d);
                        setFormData({
                          name: d.name,
                          code: d.code,
                          headOfDepartment: d.headOfDepartment || "",
                          description: d.description || "",
                        });
                        setModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs font-medium border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50"
                    >
                      Edit
                    </button>
                  </td>
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
              <h3 className="text-base font-bold text-neutral-900">
                {editingDept ? "Edit Department" : "Add Academic Department"}
              </h3>
              <button onClick={() => setModalOpen(false)}>
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Computer Science and Engineering"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Department Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="CSE"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Head of Department (HOD)
                </label>
                <input
                  type="text"
                  value={formData.headOfDepartment}
                  onChange={(e) =>
                    setFormData({ ...formData, headOfDepartment: e.target.value })
                  }
                  placeholder="Dr. K. Vijayakumar"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                />
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
                  placeholder="UG & PG Engineering Department"
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
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// 3. Reports & Analytics Page (Admin)
export const ReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await apiRequest(`/reports?${params.toString()}`);
      setReport(res);
    } catch {
      // Handle quietly
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Utilization &amp; Booking Reports
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Generated directly from PostgreSQL booking, hall utilization, and
            maintenance records.
          </p>
        </div>

        <form onSubmit={loadReport} className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white font-mono"
          />
          <span className="text-xs text-neutral-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white font-mono"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg"
          >
            Filter Period
          </button>
        </form>
      </div>

      {loading ? (
        <div className="p-8 text-sm text-neutral-500">Generating report...</div>
      ) : !report || !report.hasData ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center space-y-2">
          <FileBarChart className="w-8 h-8 text-neutral-400 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900">
            No reports available for the selected period.
          </h3>
          <p className="text-xs text-neutral-500">
            Once bookings, hall allotments, or maintenance records are recorded in
            PostgreSQL, utilization summaries will be calculated here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Booking Status Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="text-xs text-neutral-500">Total Bookings</div>
              <div className="text-xl font-bold font-mono tabular-nums mt-1">
                {report.statusSummary.total}
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="text-xs text-neutral-500">Approved</div>
              <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                {report.statusSummary.approved}
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="text-xs text-neutral-500">Pending</div>
              <div className="text-xl font-bold font-mono tabular-nums text-amber-700 mt-1">
                {report.statusSummary.pending}
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="text-xs text-neutral-500">Rejected</div>
              <div className="text-xl font-bold font-mono tabular-nums text-red-700 mt-1">
                {report.statusSummary.rejected}
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="text-xs text-neutral-500">Cancelled</div>
              <div className="text-xl font-bold font-mono tabular-nums text-neutral-600 mt-1">
                {report.statusSummary.cancelled}
              </div>
            </div>
          </div>

          {/* Hall Utilization Breakdown */}
          <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h2 className="text-base font-bold text-neutral-900">
                Seminar Hall Utilization Summary
              </h2>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-medium text-neutral-500">
                  <th className="py-3 px-5">Seminar Hall</th>
                  <th className="py-3 px-5">Building</th>
                  <th className="py-3 px-5 text-right">Seating Capacity</th>
                  <th className="py-3 px-5 text-right">Total Requests</th>
                  <th className="py-3 px-5 text-right">Approved Events</th>
                  <th className="py-3 px-5 text-right">Total Attendees Served</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {report.hallUtilization.map((h: any) => (
                  <tr key={h.hallId}>
                    <td className="py-3 px-5 font-medium text-neutral-900">
                      {h.hallName} ({h.code})
                    </td>
                    <td className="py-3 px-5 text-neutral-600">{h.building}</td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums">
                      {h.capacity}
                    </td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums">
                      {h.totalRequests}
                    </td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                      {h.approvedBookingsCount}
                    </td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums">
                      {h.totalAttendeesServed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
};

// 4. Audit Logs Page (Admin)
export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ auditLogs: any[] }>("/audit-logs")
      .then((res) => setLogs(res.auditLogs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-5">
        <h1 className="text-2xl font-bold text-neutral-900">System Audit Logs</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Immutable security and administrative event trail recorded in PostgreSQL.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-sm text-neutral-500">Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <p className="text-sm text-neutral-600">No audit log entries recorded.</p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-medium text-neutral-500">
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5">Action</th>
                <th className="py-3 px-5">User</th>
                <th className="py-3 px-5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 px-5 font-mono text-xs tabular-nums text-neutral-600 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-5 font-mono text-xs font-semibold text-neutral-900">
                    {log.action}
                  </td>
                  <td className="py-3 px-5 text-xs text-neutral-700">
                    {log.userName || "System"}{" "}
                    {log.userEmail ? `(${log.userEmail})` : ""}
                  </td>
                  <td className="py-3 px-5 text-xs text-neutral-700">
                    {log.details}
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
