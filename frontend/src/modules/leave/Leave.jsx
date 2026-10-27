
import { useEffect, useMemo, useState } from "react";
import "./Leave.css";

const API = "http://127.0.0.1:8001";

const emptyForm = {
  employee_id: "",
  leave_type: "Casual",
  start_date: "",
  end_date: "",
  reason: "",
  status: "Pending",
};

export default function Leave() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [leaveResponse, employeeResponse] = await Promise.all([
        fetch(`${API}/leave/`),
        fetch(`${API}/employees/`),
      ]);

      if (!leaveResponse.ok || !employeeResponse.ok) {
        throw new Error("Unable to load leave requests or employees.");
      }

      const leaveData = await leaveResponse.json();
      const employeeData = await employeeResponse.json();

      setLeaves(Array.isArray(leaveData) ? leaveData : []);
      setEmployees(
        Array.isArray(employeeData)
          ? employeeData
          : employeeData.items || employeeData.employees || []
      );
    } catch (err) {
      setError(err.message || "Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const employeeName = (id) => {
    const employee = employees.find((item) => item.id === id);
    return employee?.full_name || employee?.name || `Employee #${id}`;
  };

  const filteredLeaves = useMemo(() => {
    const term = search.toLowerCase();

    return leaves.filter((leave) =>
      [
        employeeName(leave.employee_id),
        leave.leave_type,
        leave.status,
        leave.reason,
        leave.start_date,
        leave.end_date,
      ].some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [leaves, employees, search]);

  const counts = {
    total: leaves.length,
    pending: leaves.filter((item) => item.status === "Pending").length,
    approved: leaves.filter((item) => item.status === "Approved").length,
    rejected: leaves.filter((item) => item.status === "Rejected").length,
  };

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(leave) {
    setForm({
      employee_id: String(leave.employee_id),
      leave_type: leave.leave_type,
      start_date: String(leave.start_date).slice(0, 10),
      end_date: String(leave.end_date).slice(0, 10),
      reason: leave.reason,
      status: leave.status,
    });
    setEditingId(leave.id);
    setMessage("");
    setShowForm(true);
  }

  async function saveLeave(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (form.end_date < form.start_date) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    try {
      const payload = {
        ...form,
        employee_id: Number(form.employee_id),
      };

      const response = await fetch(
        editingId ? `${API}/leave/${editingId}` : `${API}/leave/`,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.detail
            ? typeof result.detail === "string"
              ? result.detail
              : JSON.stringify(result.detail)
            : "Unable to save leave request."
        );
      }

      setMessage(editingId ? "Leave request updated successfully!" : "Leave request submitted successfully!");
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save leave request.");
    }
  }

  async function changeStatus(leave, status) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/leave/${leave.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...leave, status }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.detail || "Unable to update leave status."
        );
      }

      setMessage(`Leave request ${status.toLowerCase()} successfully!`);
      await loadData();
    } catch (err) {
      setError(String(err.message || "Failed to update status."));
    }
  }

  async function deleteLeave(leave) {
    if (!window.confirm(`Delete the leave request for ${employeeName(leave.employee_id)}?`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/leave/${leave.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete leave request.");
      }

      setMessage("Leave request deleted successfully!");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete leave request.");
    }
  }

  return (
    <main className="leave-page">
      <header className="leave-heading">
        <div>
          <p className="leave-eyebrow">WORKFORCE OVERVIEW</p>
          <h1>Leave Management</h1>
          <p className="leave-subtitle">
            Manage employee leave applications and approvals.
          </p>
        </div>
        <button className="leave-primary" onClick={openAddForm}>
          + Apply Leave
        </button>
      </header>

      {message && <div className="leave-success">{message}</div>}
      {error && <div className="leave-error">{error}</div>}

      <section className="leave-stats">
        <article className="leave-stat">
          <span>Total Requests</span>
          <strong>{counts.total}</strong>
        </article>
        <article className="leave-stat">
          <span>Pending</span>
          <strong className="leave-orange">{counts.pending}</strong>
        </article>
        <article className="leave-stat">
          <span>Approved</span>
          <strong className="leave-green">{counts.approved}</strong>
        </article>
        <article className="leave-stat">
          <span>Rejected</span>
          <strong className="leave-red">{counts.rejected}</strong>
        </article>
      </section>

      {showForm && (
        <section className="leave-card">
          <h2>{editingId ? "Edit Leave Request" : "Apply for Leave"}</h2>

          <form className="leave-form" onSubmit={saveLeave}>
            <label>
              Employee
              <select
                required
                value={form.employee_id}
                onChange={(e) =>
                  setForm({ ...form, employee_id: e.target.value })
                }
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name || employee.name} (ID: {employee.id})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Leave Type
              <select
                value={form.leave_type}
                onChange={(e) =>
                  setForm({ ...form, leave_type: e.target.value })
                }
              >
                {["Casual", "Sick", "Annual", "Maternity", "Other"].map(
                  (type) => (
                    <option key={type} value={type}>{type}</option>
                  )
                )}
              </select>
            </label>

            <label>
              Start Date
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
            </label>

            <label>
              End Date
              <input
                type="date"
                required
                min={form.start_date || undefined}
                value={form.end_date}
                onChange={(e) =>
                  setForm({ ...form, end_date: e.target.value })
                }
              />
            </label>

            <label className="leave-wide">
              Reason
              <textarea
                required
                maxLength={2000}
                rows={3}
                placeholder="Enter reason for leave..."
                value={form.reason}
                onChange={(e) =>
                  setForm({ ...form, reason: e.target.value })
                }
              />
            </label>

            {editingId && (
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  {["Pending", "Approved", "Rejected"].map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="leave-form-actions leave-wide">
              <button className="leave-primary" type="submit">
                {editingId ? "Save Changes" : "Submit Request"}
              </button>
              <button
                className="leave-secondary"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="leave-card">
        <div className="leave-table-heading">
          <div>
            <h2>Leave Requests</h2>
            <p>Review, search, and manage employee leave applications.</p>
          </div>
          <button className="leave-secondary" onClick={loadData}>
            Refresh
          </button>
        </div>

        <input
          className="leave-search"
          placeholder="Search employee, leave type, status, or reason..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="leave-table-wrap">
          <table className="leave-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>EMPLOYEE</th>
                <th>LEAVE TYPE</th>
                <th>START DATE</th>
                <th>END DATE</th>
                <th>REASON</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="leave-empty">Loading leave requests...</td></tr>
              ) : filteredLeaves.length === 0 ? (
                <tr><td colSpan={8} className="leave-empty">No leave requests found.</td></tr>
              ) : (
                filteredLeaves.map((leave) => (
                  <tr key={leave.id}>
                    <td>{leave.id}</td>
                    <td>
                      <strong>{employeeName(leave.employee_id)}</strong>
                      <small>Employee ID: {leave.employee_id}</small>
                    </td>
                    <td>{leave.leave_type}</td>
                    <td>{String(leave.start_date).slice(0, 10)}</td>
                    <td>{String(leave.end_date).slice(0, 10)}</td>
                    <td className="leave-reason">{leave.reason}</td>
                    <td>
                      <span className={`leave-badge ${String(leave.status).toLowerCase()}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td>
                      <div className="leave-actions">
                        <button className="leave-edit" onClick={() => openEditForm(leave)}>
                          Edit
                        </button>
                        {leave.status === "Pending" && (
                          <>
                            <button className="leave-approve" onClick={() => changeStatus(leave, "Approved")}>
                              Approve
                            </button>
                            <button className="leave-reject" onClick={() => changeStatus(leave, "Rejected")}>
                              Reject
                            </button>
                          </>
                        )}
                        <button className="leave-delete" onClick={() => deleteLeave(leave)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
