
import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8001/employees";

const initialForm = {
  full_name: "",
  email: "",
  department: "",
  job_title: "",
  salary: "",
  hire_date: new Date().toISOString().slice(0, 10),
  is_active: true,
};

const cellStyle = {
  padding: "14px 12px",
  borderBottom: "1px solid #e8edf5",
  textAlign: "left",
  fontSize: "13px",
  color: "#475569",
  whiteSpace: "nowrap",
};

const buttonStyle = {
  padding: "9px 12px",
  border: "none",
  borderRadius: "7px",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  border: "1px solid #d8dced",
  borderRadius: "8px",
  boxSizing: "border-box",
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  async function loadEmployees() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API);

      if (!response.ok) {
        throw new Error(`Could not load employees (${response.status}).`);
      }

      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      setError(err.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  function startAdd() {
    setEditingId(null);
    setForm({
      ...initialForm,
      hire_date: new Date().toISOString().slice(0, 10),
    });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function startEdit(employee) {
    setEditingId(employee.id);
    setForm({
      full_name: employee.full_name || "",
      email: employee.email || "",
      department: employee.department || "",
      job_title: employee.job_title || "",
      salary: employee.salary ?? "",
      hire_date: employee.hire_date
        ? String(employee.hire_date).slice(0, 10)
        : "",
      is_active: employee.is_active ?? true,
    });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveEmployee(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const wasEditing = editingId !== null;

    try {
      const response = await fetch(
        wasEditing ? `${API}/${editingId}` : API,
        {
          method: wasEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            salary: Number(form.salary),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail || "Unable to save employee.")
        );
      }

      setShowForm(false);
      setEditingId(null);
      setForm(initialForm);
      setMessage(
        wasEditing
          ? "Employee updated successfully!"
          : "Employee added successfully!"
      );

      await loadEmployees();
    } catch (err) {
      setError(err.message || "Unable to save employee.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(employee) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${employee.full_name}?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/${employee.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail || "Unable to delete employee.")
        );
      }

      setMessage("Employee deleted successfully!");
      await loadEmployees();
    } catch (err) {
      setError(err.message || "Unable to delete employee.");
    }
  }

  const filteredEmployees = employees.filter((employee) =>
    [
      employee.full_name,
      employee.email,
      employee.department,
      employee.job_title,
    ].some((value) =>
      String(value || "").toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div
      style={{
        padding: "30px",
        width: "100%",
        boxSizing: "border-box",
        color: "#172033",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ marginBottom: "28px" }}>
        <p
          style={{
            color: "#6554e8",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "2px",
          }}
        >
          WORKFORCE OVERVIEW
        </p>
        <h1 style={{ margin: "8px 0", fontSize: "32px" }}>Employees</h1>
        <p style={{ color: "#8490a5" }}>
          Manage and review your employee information.
        </p>
      </div>

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e5eaf3",
          borderRadius: "16px",
          padding: "24px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 8px" }}>Employee Management</h3>
            <p style={{ color: "#8490a5", margin: 0 }}>
              Manage your workforce records.
            </p>
          </div>

          <button
            type="button"
            onClick={startAdd}
            style={{ ...buttonStyle, background: "#6554e8" }}
          >
            + Add Employee
          </button>
        </div>

        {message && (
          <p style={{ color: "#059669" }}>{message}</p>
        )}

        {error && (
          <p
            style={{
              color: "#dc2626",
              background: "#fef2f2",
              padding: "12px",
              borderRadius: "8px",
              overflowWrap: "anywhere",
            }}
          >
            {error}
          </p>
        )}

        {showForm && (
          <form
            onSubmit={saveEmployee}
            style={{
              marginTop: "24px",
              marginBottom: "24px",
              padding: "20px",
              background: "#f8faff",
              borderRadius: "12px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <h3 style={{ gridColumn: "1 / -1", margin: 0 }}>
              {editingId !== null ? "Edit Employee" : "Add New Employee"}
            </h3>

            {[
              ["full_name", "Full Name", "text"],
              ["email", "Email", "email"],
              ["department", "Department", "text"],
              ["job_title", "Job Title", "text"],
              ["salary", "Salary", "number"],
              ["hire_date", "Hire Date", "date"],
            ].map(([name, label, type]) => (
              <label
                key={name}
                style={{ display: "grid", gap: "7px", fontSize: "13px" }}
              >
                {label}
                <input
                  name={name}
                  type={type}
                  value={form[name]}
                  onChange={handleChange}
                  required
                  min={type === "number" ? "0" : undefined}
                  step={type === "number" ? "0.01" : undefined}
                  style={inputStyle}
                />
              </label>
            ))}

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                gridColumn: "1 / -1",
              }}
            >
              <input
                type="checkbox"
                name="is_active"
                checked={Boolean(form.is_active)}
                onChange={handleChange}
              />
              Active employee
            </label>

            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                disabled={saving}
                style={{
                  ...buttonStyle,
                  background: "#059669",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Update Employee"
                    : "Save Employee"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                style={{ ...buttonStyle, background: "#64748b" }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "24px",
            marginBottom: "14px",
          }}
        >
          <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
            Total employees: {filteredEmployees.length}
          </p>

          <button
            type="button"
            onClick={loadEmployees}
            style={{ ...buttonStyle, background: "#475569" }}
          >
            Refresh
          </button>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search employees..."
          style={{ ...inputStyle, marginBottom: "18px" }}
        />

        <div
          style={{
            width: "100%",
            overflowX: "auto",
            border: "1px solid #edf0f6",
            borderRadius: "10px",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: "1150px",
              borderCollapse: "collapse",
              background: "#ffffff",
            }}
          >
            <thead>
              <tr style={{ background: "#f0efff" }}>
                {[
                  "ID",
                  "Full Name",
                  "Email",
                  "Department",
                  "Job Title",
                  "Salary",
                  "Hire Date",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      ...cellStyle,
                      color: "#475569",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={cellStyle}>
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} style={cellStyle}>
                    No employees found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td style={cellStyle}>{employee.id}</td>
                    <td style={cellStyle}>{employee.full_name}</td>
                    <td style={cellStyle}>{employee.email}</td>
                    <td style={cellStyle}>{employee.department}</td>
                    <td style={cellStyle}>{employee.job_title}</td>
                    <td style={cellStyle}>{employee.salary ?? "—"}</td>
                    <td style={cellStyle}>
                      {employee.hire_date
                        ? String(employee.hire_date).slice(0, 10)
                        : "—"}
                    </td>

                    <td style={cellStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          color: employee.is_active ? "#059669" : "#dc2626",
                          background: employee.is_active
                            ? "#ecfdf5"
                            : "#fef2f2",
                          padding: "5px 9px",
                          borderRadius: "20px",
                          fontWeight: 600,
                        }}
                      >
                        {employee.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td
                      style={{
                        ...cellStyle,
                        minWidth: "155px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => startEdit(employee)}
                          style={{
                            ...buttonStyle,
                            background: "#2563eb",
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteEmployee(employee)}
                          style={{
                            ...buttonStyle,
                            background: "#dc2626",
                          }}
                        >
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

      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          color: "#8490a5",
          fontSize: "12px",
          marginTop: "24px",
        }}
      >
        <span>WorkForce AI Pro</span>
        <span>HR Attrition Prediction &amp; Workforce Intelligence Platform</span>
      </footer>
    </div>
  );
}
