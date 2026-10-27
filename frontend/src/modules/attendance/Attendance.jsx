
import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8001/attendance/";

const styles = {
  page: { padding: "28px", color: "#172033", fontFamily: "Arial, sans-serif" },
  heading: { fontSize: "30px", margin: "0 0 8px" },
  muted: { color: "#718096", marginBottom: "24px" },
  button: {
    padding: "10px 14px",
    border: 0,
    borderRadius: "7px",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  card: {
    background: "#fff",
    border: "1px solid #e1e8f5",
    borderRadius: "15px",
    padding: "20px",
    marginBottom: "22px",
  },
  input: {
    padding: "11px 12px",
    border: "1px solid #d5deef",
    borderRadius: "8px",
    width: "100%",
    boxSizing: "border-box",
  },
  cell: {
    padding: "14px 12px",
    textAlign: "left",
    borderBottom: "1px solid #e6ebf4",
    whiteSpace: "nowrap",
  },
  label: {
    display: "block",
    fontSize: "13px",
    marginBottom: "7px",
    color: "#526078",
  },
};

const emptyForm = {
  employee_id: "",
  attendance_date: new Date().toLocaleDateString("en-CA"),
  check_in: "",
  check_out: "",
  status: "Present",
  remarks: "",
};

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [attendanceResponse, employeeResponse] = await Promise.all([
        fetch(API),
        fetch("http://127.0.0.1:8001/employees/"),
      ]);

      if (!attendanceResponse.ok) {
        throw new Error("Could not load attendance records.");
      }

      const attendanceData = await attendanceResponse.json();
      setRecords(Array.isArray(attendanceData) ? attendanceData : []);

      if (employeeResponse.ok) {
        const employeeData = await employeeResponse.json();
        setEmployees(Array.isArray(employeeData) ? employeeData : []);
      }
    } catch (err) {
      setError(err.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = useMemo(() => {
    const term = search.toLowerCase().trim();

    return records.filter((record) => {
      const employee = employees.find(
        (item) => item.id === record.employee_id
      );

      const employeeName = employee
        ? employee.full_name || employee.name || ""
        : "";

      const matchesSearch = [
        record.id,
        record.employee_id,
        employeeName,
        record.status,
        record.remarks,
      ].some((value) => String(value ?? "").toLowerCase().includes(term));

      const matchesDate =
        !filterDate || String(record.attendance_date).slice(0, 10) === filterDate;

      return matchesSearch && matchesDate;
    });
  }, [records, employees, search, filterDate]);

  const totals = useMemo(() => ({
    total: records.length,
    present: records.filter((r) => r.status?.toLowerCase() === "present").length,
    absent: records.filter((r) => r.status?.toLowerCase() === "absent").length,
    late: records.filter((r) => r.status?.toLowerCase() === "late").length,
  }), [records]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function startAdd() {
    setEditingId(null);
    setForm({ ...emptyForm, attendance_date: new Date().toLocaleDateString("en-CA") });
    setShowForm(true);
    setError("");
  }

  function startEdit(record) {
    setEditingId(record.id);
    setForm({
      employee_id: String(record.employee_id ?? ""),
      attendance_date: String(record.attendance_date ?? "").slice(0, 10),
      check_in: formatTime(record.check_in) === "—" ? "" : formatTime(record.check_in),
      check_out: formatTime(record.check_out) === "—" ? "" : formatTime(record.check_out),
      status: record.status || "Present",
      remarks: record.remarks || "",
    });
    setShowForm(true);
    setError("");
  }

  async function saveAttendance(event) {
    event.preventDefault();
    setError("");

    if (!form.employee_id || !form.attendance_date) {
      setError("Please select an employee and attendance date.");
      return;
    }

    setSaving(true);

    const payload = {
      employee_id: Number(form.employee_id),
      attendance_date: form.attendance_date,
      check_in: form.check_in || null,
      check_out: form.check_out || null,
      status: form.status,
      remarks: form.remarks.trim() || null,
    };

    try {
      const response = await fetch(
        editingId ? `${API}${editingId}` : API,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = result.detail;
        throw new Error(
          Array.isArray(detail)
            ? detail.map((item) => item.msg).join(", ")
            : detail || "Could not save attendance."
        );
      }

      setShowForm(false);
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAttendance(record) {
    if (!window.confirm(`Delete attendance record #${record.id}?`)) return;

    setError("");

    try {
      const response = await fetch(`${API}${record.id}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.detail || "Could not delete attendance.");
      }

      await loadData();
    } catch (err) {
      setError(err.message || "Could not delete attendance.");
    }
  }

  return (
    <div style={styles.page}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h1 style={styles.heading}>Attendance Management</h1>
          <p style={styles.muted}>
            Track employee attendance, working hours, and daily status.
          </p>
        </div>

        <button
          type="button"
          onClick={startAdd}
          style={{ ...styles.button, background: "#635bff" }}
        >
          + Mark Attendance
        </button>
      </div>

      {error && (
        <div style={{
          background: "#fff1f2",
          color: "#dc2626",
          padding: "13px",
          borderRadius: "8px",
          marginBottom: "18px",
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "14px",
        marginBottom: "22px",
      }}>
        {[
          ["Total Records", totals.total, "#172033"],
          ["Present", totals.present, "#059669"],
          ["Absent", totals.absent, "#dc2626"],
          ["Late", totals.late, "#d97706"],
        ].map(([label, value, color]) => (
          <div key={label} style={styles.card}>
            <div style={{ color: "#718096", fontSize: "13px" }}>{label}</div>
            <div style={{ fontSize: "25px", fontWeight: 700, color, marginTop: "8px" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={saveAttendance} style={styles.card}>
          <h2 style={{ marginTop: 0 }}>
            {editingId ? "Edit Attendance" : "Mark Attendance"}
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "16px",
          }}>
            <div>
              <label style={styles.label}>Employee *</label>
              <select
                name="employee_id"
                value={form.employee_id}
                onChange={updateForm}
                required
                style={styles.input}
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name || employee.name || `Employee ${employee.id}`}
                    {" "} (ID: {employee.id})
                  </option>
                ))}
              </select>
              {employees.length === 0 && (
                <small>No employees loaded. Add an employee first.</small>
              )}
            </div>

            <div>
              <label style={styles.label}>Date *</label>
              <input
                type="date"
                name="attendance_date"
                value={form.attendance_date}
                onChange={updateForm}
                required
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Check-in</label>
              <input
                type="time"
                name="check_in"
                value={form.check_in}
                onChange={updateForm}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Check-out</label>
              <input
                type="time"
                name="check_out"
                value={form.check_out}
                onChange={updateForm}
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Status *</label>
              <select
                name="status"
                value={form.status}
                onChange={updateForm}
                required
                style={styles.input}
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Remarks</label>
              <input
                name="remarks"
                value={form.remarks}
                onChange={updateForm}
                placeholder="Optional remarks"
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button
              type="submit"
              disabled={saving}
              style={{ ...styles.button, background: "#635bff" }}
            >
              {saving ? "Saving..." : editingId ? "Update Attendance" : "Save Attendance"}
            </button>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{ ...styles.button, background: "#64748b" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: "0 0 8px" }}>Daily Attendance</h2>
            <p style={{ ...styles.muted, marginBottom: "16px" }}>
              Manage and review employee attendance records.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            style={{ ...styles.button, background: "#475569" }}
          >
            Refresh
          </button>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(200px, 1fr) 180px",
          gap: "12px",
          marginBottom: "18px",
        }}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, status, or remarks..."
            style={styles.input}
          />

          <input
            type="date"
            value={filterDate}
            onChange={(event) => setFilterDate(event.target.value)}
            style={styles.input}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
            <thead>
              <tr style={{ background: "#f0efff" }}>
                {["ID", "Employee", "Date", "Check In", "Check Out", "Status", "Remarks", "Actions"].map((heading) => (
                  <th key={heading} style={{ ...styles.cell, fontSize: "12px" }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ ...styles.cell, textAlign: "center" }}>
                    Loading attendance records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...styles.cell, textAlign: "center", color: "#718096" }}>
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const employee = employees.find(
                    (item) => item.id === record.employee_id
                  );

                  const statusColor =
                    record.status?.toLowerCase() === "present"
                      ? "#059669"
                      : record.status?.toLowerCase() === "absent"
                      ? "#dc2626"
                      : "#d97706";

                  return (
                    <tr key={record.id}>
                      <td style={styles.cell}>{record.id}</td>
                      <td style={styles.cell}>
                        {employee
                          ? employee.full_name || employee.name || `Employee ${record.employee_id}`
                          : `Employee ${record.employee_id}`}
                      </td>
                      <td style={styles.cell}>
                        {String(record.attendance_date || "").slice(0, 10)}
                      </td>
                      <td style={styles.cell}>{formatTime(record.check_in)}</td>
                      <td style={styles.cell}>{formatTime(record.check_out)}</td>
                      <td style={styles.cell}>
                        <span style={{
                          background: "#f8fafc",
                          color: statusColor,
                          padding: "5px 9px",
                          borderRadius: "20px",
                          fontWeight: 600,
                        }}>
                          {record.status}
                        </span>
                      </td>
                      <td style={styles.cell}>{record.remarks || "—"}</td>
                      <td style={styles.cell}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => startEdit(record)}
                            style={{ ...styles.button, background: "#2563eb" }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAttendance(record)}
                            style={{ ...styles.button, background: "#dc2626" }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
