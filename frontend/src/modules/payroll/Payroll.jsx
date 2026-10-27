
import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8001/payroll/";

const styles = {
  page: {
    padding: "28px",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    background: "#fff",
    border: "1px solid #e1e8f5",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "18px",
  },
  input: {
    padding: "11px",
    border: "1px solid #d5deef",
    borderRadius: "7px",
    width: "100%",
    boxSizing: "border-box",
    marginBottom: "14px",
  },
  button: {
    padding: "9px 13px",
    border: 0,
    borderRadius: "7px",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    marginRight: "6px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
  },
  cell: {
    padding: "12px",
    borderBottom: "1px solid #e5eaf3",
    textAlign: "left",
    whiteSpace: "nowrap",
  },
};

const emptyForm = {
  employee_id: "",
  payroll_month: new Date().toISOString().slice(0, 7),
  basic_salary: "",
  allowances: "0",
  deductions: "0",
  status: "Pending",
};

export default function Payroll() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [payrollResponse, employeeResponse] = await Promise.all([
        fetch(API),
        fetch("http://127.0.0.1:8001/employees"),
      ]);

      if (!payrollResponse.ok) {
        throw new Error(`Payroll API returned ${payrollResponse.status}`);
      }

      const payrollData = await payrollResponse.json();
      setRecords(Array.isArray(payrollData) ? payrollData : []);

      if (employeeResponse.ok) {
        const employeeData = await employeeResponse.json();
        setEmployees(Array.isArray(employeeData) ? employeeData : []);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      setError(
        `Unable to load payroll: ${err.message}. Check the backend and its CORS settings.`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = useMemo(() => {
    const query = search.toLowerCase().trim();

    return records.filter((record) =>
      [
        record.id,
        record.employee_id,
        record.payroll_month,
        record.status,
      ].some((value) => String(value ?? "").toLowerCase().includes(query))
    );
  }, [records, search]);

  const totalSalary = records.reduce(
    (sum, record) => sum + Number(record.net_salary || 0),
    0
  );

  const pendingCount = records.filter(
    (record) => record.status === "Pending"
  ).length;

  const paidCount = records.filter(
    (record) => record.status === "Paid"
  ).length;

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  }

  function openEditForm(record) {
    setEditingId(record.id);
    setForm({
      employee_id: String(record.employee_id ?? ""),
      payroll_month: String(record.payroll_month ?? "").slice(0, 7),
      basic_salary: String(record.basic_salary ?? ""),
      allowances: String(record.allowances ?? 0),
      deductions: String(record.deductions ?? 0),
      status: record.status ?? "Pending",
    });
    setShowForm(true);
    setError("");
  }

  async function savePayroll(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      employee_id: Number(form.employee_id),
      payroll_month: form.payroll_month,
      basic_salary: Number(form.basic_salary),
      allowances: Number(form.allowances || 0),
      deductions: Number(form.deductions || 0),
      status: form.status,
    };

    try {
      const response = await fetch(
        editingId === null ? API : `${API}${editingId}`,
        {
          method: editingId === null ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Request failed (${response.status})`);
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(`Could not save payroll: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function deletePayroll(record) {
    if (!window.confirm(`Delete payroll record #${record.id}?`)) return;

    setError("");

    try {
      const response = await fetch(`${API}${record.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Delete failed (${response.status})`);
      }

      await loadData();
    } catch (err) {
      setError(`Could not delete payroll: ${err.message}`);
    }
  }

  return (
    <main style={styles.page}>
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
          <h1 style={{ margin: "0 0 8px" }}>Payroll Management</h1>
          <p style={{ color: "#718096" }}>
            Manage employee salaries, deductions, and payroll records.
          </p>
        </div>

        <button
          type="button"
          style={{ ...styles.button, background: "#6554f0" }}
          onClick={openAddForm}
        >
          + Add Payroll
        </button>
      </div>

      {error && (
        <p
          role="alert"
          style={{
            background: "#fff1f2",
            color: "#c81e1e",
            padding: "12px",
            borderRadius: "8px",
            overflowWrap: "anywhere",
          }}
        >
          {error}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          margin: "20px 0",
        }}
      >
        {[
          ["Payroll Records", records.length, "#172033"],
          [
            "Total Net Salary",
            `₹${totalSalary.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            "#6554f0",
          ],
          ["Pending", pendingCount, "#d97706"],
          ["Paid", paidCount, "#059669"],
        ].map(([label, value, color]) => (
          <div key={label} style={styles.card}>
            <div style={{ color: "#718096", fontSize: "13px" }}>
              {label}
            </div>
            <h2 style={{ color, marginBottom: 0 }}>{value}</h2>
          </div>
        ))}
      </div>

      {showForm && (
        <section style={styles.card}>
          <h2>{editingId === null ? "Add Payroll" : "Edit Payroll"}</h2>

          <form onSubmit={savePayroll}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
              }}
            >
              <label style={styles.label}>
                Employee
                <select
                  name="employee_id"
                  value={form.employee_id}
                  onChange={updateField}
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
              </label>

              <label style={styles.label}>
                Payroll Month
                <input
                  type="month"
                  name="payroll_month"
                  value={form.payroll_month}
                  onChange={updateField}
                  required
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                Basic Salary
                <input
                  type="number"
                  name="basic_salary"
                  min="0"
                  step="0.01"
                  value={form.basic_salary}
                  onChange={updateField}
                  required
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                Allowances
                <input
                  type="number"
                  name="allowances"
                  min="0"
                  step="0.01"
                  value={form.allowances}
                  onChange={updateField}
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                Deductions
                <input
                  type="number"
                  name="deductions"
                  min="0"
                  step="0.01"
                  value={form.deductions}
                  onChange={updateField}
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={updateField}
                  style={styles.input}
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.button,
                background: saving ? "#94a3b8" : "#059669",
              }}
            >
              {saving ? "Saving..." : "Save Payroll"}
            </button>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{ ...styles.button, background: "#64748b" }}
            >
              Cancel
            </button>
          </form>
        </section>
      )}

      <section style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 5px" }}>Payroll Records</h2>
            <p style={{ color: "#718096", marginTop: 0 }}>
              Review and manage employee payroll.
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

        <input
          type="search"
          placeholder="Search by payroll ID, employee ID, month, or status..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={styles.input}
        />

        <div style={{ overflowX: "auto", width: "100%" }}>
          <table
            style={{
              width: "100%",
              minWidth: "1000px",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ background: "#f0efff" }}>
                {[
                  "ID",
                  "Employee",
                  "Payroll Month",
                  "Basic Salary",
                  "Allowances",
                  "Deductions",
                  "Net Salary",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} style={styles.cell}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ ...styles.cell, textAlign: "center" }}>
                    Loading payroll records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ ...styles.cell, textAlign: "center" }}>
                    No payroll records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td style={styles.cell}>{record.id}</td>
                    <td style={styles.cell}>{record.employee_id}</td>
                    <td style={styles.cell}>{record.payroll_month}</td>
                    <td style={styles.cell}>
                      ₹{Number(record.basic_salary || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={styles.cell}>
                      ₹{Number(record.allowances || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={styles.cell}>
                      ₹{Number(record.deductions || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={styles.cell}>
                      ₹{Number(record.net_salary || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={styles.cell}>
                      <span
                        style={{
                          color: record.status === "Paid" ? "#059669" : "#d97706",
                          background: record.status === "Paid" ? "#ecfdf5" : "#fffbeb",
                          padding: "5px 9px",
                          borderRadius: "20px",
                        }}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td style={styles.cell}>
                      <button
                        type="button"
                        onClick={() => openEditForm(record)}
                        style={{ ...styles.button, background: "#2563eb" }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePayroll(record)}
                        style={{ ...styles.button, background: "#dc2626" }}
                      >
                        Delete
                      </button>
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
