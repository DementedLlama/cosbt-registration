"use client";

import { useState } from "react";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "VIEW_ONLY";
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function UserManagement({
  initialUsers,
  currentUserId,
}: {
  initialUsers: UserData[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ─── Create form state ──────────────────────────────────────────
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "VIEW_ONLY" as string,
  });
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setError("");
    setSuccess("");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create user.");
        return;
      }
      setUsers((prev) => [json.data, ...prev]);
      setCreateForm({ name: "", email: "", password: "", role: "VIEW_ONLY" });
      setShowCreate(false);
      setSuccess("User created successfully.");
    } catch {
      setError("Network error.");
    } finally {
      setCreating(false);
    }
  }

  // ─── Edit form state ────────────────────────────────────────────
  const [editForm, setEditForm] = useState({
    name: "",
    role: "" as string,
    password: "",
  });
  const [saving, setSaving] = useState(false);

  function startEdit(user: UserData) {
    setEditingId(user.id);
    setEditForm({ name: user.name, role: user.role, password: "" });
    setError("");
    setSuccess("");
  }

  async function handleUpdate(userId: string) {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        role: editForm.role,
      };
      if (editForm.password) payload.password = editForm.password;

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to update user.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? json.data : u))
      );
      setEditingId(null);
      setSuccess("User updated successfully.");
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  // ─── Toggle active ──────────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function toggleActive(user: UserData) {
    setError("");
    setSuccess("");
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to update user.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? json.data : u))
      );
      setSuccess(
        user.isActive
          ? `${user.name} has been deactivated.`
          : `${user.name} has been reactivated.`
      );
    } catch {
      setError("Network error.");
    } finally {
      setTogglingId(null);
    }
  }

  const roleLabel = (role: string) => role.replace(/_/g, " ");

  return (
    <div>
      {/* Feedback messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Create button / form */}
      {!showCreate ? (
        <button
          onClick={() => {
            setShowCreate(true);
            setError("");
            setSuccess("");
          }}
          className="btn-primary text-sm mb-6"
        >
          + Create User
        </button>
      ) : (
        <div className="card p-5 mb-6">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">
            Create New User
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Full name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="admin@cosbt.org.sg"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">Password (min 8 chars)</label>
              <input
                type="password"
                className="form-input"
                placeholder="Initial password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">Role</label>
              <select
                className="form-input"
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, role: e.target.value }))
                }
              >
                <option value="VIEW_ONLY">View Only</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="btn-primary text-sm disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create User"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Email
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Role
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Last Login
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id}>
                {editingId === user.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="form-input text-sm py-1"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        className="form-input text-sm py-1"
                        value={editForm.role}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, role: e.target.value }))
                        }
                        disabled={user.id === currentUserId}
                      >
                        <option value="VIEW_ONLY">View Only</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3" colSpan={2}>
                      <input
                        type="password"
                        className="form-input text-sm py-1"
                        placeholder="New password (leave blank to keep)"
                        value={editForm.password}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            password: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleUpdate(user.id)}
                          disabled={saving}
                          className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {user.name}
                      {user.id === currentUserId && (
                        <span className="text-xs ml-1 text-blue-600">
                          (you)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          user.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString("en-SG", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(user)}
                          className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        {user.id !== currentUserId && (
                          <button
                            onClick={() => toggleActive(user)}
                            disabled={togglingId === user.id}
                            className={`text-xs font-medium px-2 py-1 rounded disabled:opacity-60 ${
                              user.isActive
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                          >
                            {user.isActive ? "Deactivate" : "Reactivate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
