
import { useCallback, useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8001/interventions/";
const EMPLOYEES_URL = "http://127.0.0.1:8001/employees/";
const RECOMMENDATIONS_URL =
  "http://127.0.0.1:8001/interventions/recommendations/";

const initialForm = {
  employee_id: "",
  prediction_id: "",
  intervention_type: "Employee Engagement Meeting",
  description: "",
  assigned_to: "",
  status: "Pending",
  priority: "Medium",
  follow_up_date: "",
  outcome: "",
};

const editableFields = [
  "intervention_type",
  "description",
  "assigned_to",
  "status",
  "priority",
  "follow_up_date",
  "outcome",
];

const styles = {
  page: {
    padding: "24px",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  heading: { fontSize: "28px", margin: "0 0 8px" },
  subtitle: { color: "#64748b", marginBottom: "24px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
    marginBottom: "20px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "16px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "7px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    fontSize: "14px",
    background: "#ffffff",
  },
  button: {
    padding: "10px 15px",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
  },
  primary: { background: "#2563eb", color: "#ffffff" },
  secondary: { background: "#e2e8f0", color: "#1e293b" },
  danger: { background: "#fee2e2", color: "#b91c1c" },
  tableWrap: { overflowX: "auto", width: "100%" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    minWidth: "850px",
  },
  cell: {
    padding: "13px 12px",
    textAlign: "left",
    borderBottom: "1px solid #e2e8f0",
    verticalAlign: "top",
  },
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

function toDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
}

function normalizeField(field, value) {
  if (field === "assigned_to" || field === "outcome") {
    return value.trim() || null;
  }

  if (field === "follow_up_date") {
    return value ? new Date(value).toISOString() : null;
  }

  return value.trim();
}

function riskColor(level) {
  if (level === "High") return "#b91c1c";
  if (level === "Medium") return "#b45309";
  if (level === "Low") return "#15803d";
  return "#475569";
}

export default function Interventions() {
  const [interventions, setInterventions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [editBaseline, setEditBaseline] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [recommendationEmployeeId, setRecommendationEmployeeId] =
    useState("");
  const [recommendations, setRecommendations] = useState(null);
  const [recommendationsLoading, setRecommendationsLoading] =
    useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [interventionResponse, employeeResponse] =
        await Promise.all([
          fetch(API_URL),
          fetch(EMPLOYEES_URL),
        ]);

      if (!interventionResponse.ok) {
        throw new Error("Could not load intervention records.");
      }

      if (!employeeResponse.ok) {
        throw new Error("Could not load employees.");
      }

      const interventionData = await interventionResponse.json();
      const employeeData = await employeeResponse.json();

      setInterventions(
        Array.isArray(interventionData) ? interventionData : []
      );
      setEmployees(Array.isArray(employeeData) ? employeeData : []);
    } catch (err) {
      setError(
        `${getErrorMessage(err)} Check that the backend is running on port 8001.`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setEditBaseline(null);
  }

  async function loadRecommendations(employeeId) {
    if (!employeeId) {
      setRecommendations(null);
      setRecommendationsError("Please select an employee.");
      return;
    }

    setRecommendationsLoading(true);
    setRecommendationsError("");
    setRecommendations(null);

    try {
      const response = await fetch(
        `${RECOMMENDATIONS_URL}${encodeURIComponent(employeeId)}`
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "Could not load recommendations."
        );
      }

      setRecommendations(result);
    } catch (err) {
      setRecommendationsError(getErrorMessage(err));
    } finally {
      setRecommendationsLoading(false);
    }
  }

  function createFromRecommendation(recommendation) {
    const employeeId = String(recommendations.employee_id);

    setEditingId(null);
    setEditBaseline(null);
    setForm({
      ...initialForm,
      employee_id: employeeId,
      prediction_id: String(recommendations.prediction_id),
      intervention_type: recommendation.title,
      description: recommendation.description,
      priority: recommendation.priority,
      status: "Pending",
      assigned_to: "HR Team",
    });

    setMessage(
      "Recommendation added to the form. Review it before creating the intervention."
    );
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.employee_id && !editingId) {
      setError("Please select an employee.");
      return;
    }

    if (
      !form.intervention_type.trim() ||
      !form.description.trim()
    ) {
      setError("Intervention type and description are required.");
      return;
    }

    let payload;

    if (editingId) {
      if (!editBaseline) {
        setError("Please reopen the intervention before editing.");
        return;
      }

      payload = {};

      for (const field of editableFields) {
        if (form[field] !== editBaseline[field]) {
          payload[field] = normalizeField(field, form[field]);
        }
      }

      if (Object.keys(payload).length === 0) {
        setMessage("No changes to save.");
        return;
      }
    } else {
      payload = {
        employee_id: Number(form.employee_id),
        prediction_id: form.prediction_id
          ? Number(form.prediction_id)
          : null,
        intervention_type: form.intervention_type.trim(),
        description: form.description.trim(),
        assigned_to: form.assigned_to.trim() || null,
        status: form.status,
        priority: form.priority,
        follow_up_date: form.follow_up_date
          ? new Date(form.follow_up_date).toISOString()
          : null,
        outcome: form.outcome.trim() || null,
      };
    }

    setSaving(true);

    try {
      const url = editingId ? `${API_URL}${editingId}` : API_URL;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "Could not save the intervention. Please check your input."
        );
      }

      setMessage(
        editingId
          ? "Intervention updated successfully."
          : "Intervention created successfully."
      );

      resetForm();
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(item) {
    const values = {
      employee_id: String(item.employee_id ?? ""),
      prediction_id: item.prediction_id
        ? String(item.prediction_id)
        : "",
      intervention_type: item.intervention_type ?? "",
      description: item.description ?? "",
      assigned_to: item.assigned_to ?? "",
      status: item.status ?? "Pending",
      priority: item.priority ?? "Medium",
      follow_up_date: toDateTimeLocal(item.follow_up_date),
      outcome: item.outcome ?? "",
    };

    setEditingId(item.id);
    setForm(values);
    setEditBaseline(values);
    setMessage("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Delete intervention #${item.id}? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.detail || "Could not delete the intervention."
        );
      }

      setMessage("Intervention deleted successfully.");

      if (editingId === item.id) {
        resetForm();
      }

      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const visibleInterventions = interventions.filter(
    (item) => !statusFilter || item.status === statusFilter
  );

  const pendingCount = interventions.filter(
    (item) => item.status === "Pending"
  ).length;

  const inProgressCount = interventions.filter(
    (item) => item.status === "In Progress"
  ).length;

  const completedCount = interventions.filter(
    (item) => item.status === "Completed"
  ).length;

  return (
    <main style={styles.page}>
      <header>
        <h1 style={styles.heading}>
          HR Intervention & Decision Support
        </h1>
        <p style={styles.subtitle}>
          Review retention suggestions, create HR actions, and track
          intervention progress.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            ...styles.card,
            color: "#b91c1c",
            background: "#fef2f2",
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          style={{
            ...styles.card,
            color: "#166534",
            background: "#f0fdf4",
          }}
        >
          {message}
        </div>
      )}

      <section style={styles.grid}>
        {[
          { label: "Total Interventions", value: interventions.length },
          { label: "Pending", value: pendingCount },
          { label: "In Progress", value: inProgressCount },
          { label: "Completed", value: completedCount },
        ].map((stat) => (
          <article key={stat.label} style={styles.card}>
            <p style={{ color: "#64748b", margin: "0 0 10px" }}>
              {stat.label}
            </p>
            <strong style={{ fontSize: "30px" }}>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section style={styles.card}>
        <h2 style={{ marginTop: 0 }}>HR Retention Recommendations</h2>
        <p style={{ color: "#64748b" }}>
          Select an employee to retrieve the latest saved attrition
          prediction and review suggested HR actions.
        </p>

        <div style={styles.formGrid}>
          <div>
            <label
              htmlFor="recommendationEmployee"
              style={styles.label}
            >
              Select Employee
            </label>
            <select
              id="recommendationEmployee"
              value={recommendationEmployeeId}
              onChange={(event) => {
                setRecommendationEmployeeId(event.target.value);
                setRecommendations(null);
                setRecommendationsError("");
              }}
              style={styles.input}
            >
              <option value="">Choose an employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} (ID: {employee.id})
                </option>
              ))}
            </select>
          </div>

          <div style={{ alignSelf: "end" }}>
            <button
              type="button"
              disabled={
                recommendationsLoading || !recommendationEmployeeId
              }
              onClick={() =>
                loadRecommendations(recommendationEmployeeId)
              }
              style={{
                ...styles.button,
                ...styles.primary,
                opacity:
                  recommendationsLoading || !recommendationEmployeeId
                    ? 0.6
                    : 1,
              }}
            >
              {recommendationsLoading
                ? "Loading Recommendations..."
                : "Get Recommendations"}
            </button>
          </div>
        </div>

        {recommendationsError && (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {recommendationsError}
          </p>
        )}

        {recommendations && (
          <div style={{ marginTop: "22px" }}>
            <div
              style={{
                padding: "16px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                {recommendations.employee_name}
              </h3>
              <p>
                <strong>Department:</strong>{" "}
                {recommendations.department || "Not specified"}
              </p>
              <p>
                <strong>Latest risk level:</strong>{" "}
                <span
                  style={{
                    color: riskColor(recommendations.risk_level),
                    fontWeight: "bold",
                  }}
                >
                  {recommendations.risk_level}
                </span>
              </p>
              <p>
                <strong>Attrition probability:</strong>{" "}
                {typeof recommendations.attrition_probability === "number"
                  ? `${(recommendations.attrition_probability * 100).toFixed(1)}%`
                  : "Not available"}
              </p>
              <p>
                <strong>Prediction ID:</strong>{" "}
                {recommendations.prediction_id}
              </p>
            </div>

            <h3>Suggested HR Actions</h3>

            <div style={styles.grid}>
              {(recommendations.recommendations || []).map(
                (recommendation, index) => (
                  <article
                    key={`${recommendation.title}-${index}`}
                    style={{
                      ...styles.card,
                      marginBottom: 0,
                    }}
                  >
                    <p
                      style={{
                        color: riskColor(
                          recommendation.priority === "Urgent" ||
                            recommendation.priority === "High"
                            ? "High"
                            : recommendation.priority === "Medium"
                              ? "Medium"
                              : "Low"
                        ),
                        fontWeight: "bold",
                      }}
                    >
                      {recommendation.priority} Priority
                    </p>

                    <h4>{recommendation.title}</h4>
                    <p style={{ color: "#475569", lineHeight: 1.6 }}>
                      {recommendation.description}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        createFromRecommendation(recommendation)
                      }
                      style={{
                        ...styles.button,
                        ...styles.primary,
                      }}
                    >
                      Use This Recommendation
                    </button>
                  </article>
                )
              )}
            </div>

            {recommendations.notice && (
              <p
                style={{
                  marginTop: "18px",
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                <strong>Important:</strong> {recommendations.notice}
              </p>
            )}
          </div>
        )}
      </section>

      <section style={styles.card}>
        <h2 style={{ marginTop: 0 }}>
          {editingId
            ? `Edit Intervention #${editingId}`
            : "Create Intervention"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            <div>
              <label htmlFor="employee_id" style={styles.label}>
                Employee *
              </label>
              <select
                id="employee_id"
                name="employee_id"
                value={form.employee_id}
                onChange={handleChange}
                required={!editingId}
                disabled={Boolean(editingId)}
                style={styles.input}
              >
                <option value="">Select an employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} (ID: {employee.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="intervention_type" style={styles.label}>
                Intervention Type *
              </label>
              <input
                id="intervention_type"
                name="intervention_type"
                value={form.intervention_type}
                onChange={handleChange}
                required
                maxLength={100}
                style={styles.input}
              />
            </div>

            <div>
              <label htmlFor="assigned_to" style={styles.label}>
                Assigned To
              </label>
              <input
                id="assigned_to"
                name="assigned_to"
                value={form.assigned_to}
                onChange={handleChange}
                maxLength={150}
                placeholder="HR team member"
                style={styles.input}
              />
            </div>

            <div>
              <label htmlFor="status" style={styles.label}>
                Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                style={styles.input}
              >
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" style={styles.label}>
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                style={styles.input}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>

            <div>
              <label htmlFor="follow_up_date" style={styles.label}>
                Follow-up Date
              </label>
              <input
                id="follow_up_date"
                name="follow_up_date"
                type="datetime-local"
                value={form.follow_up_date}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div>
              <label htmlFor="prediction_id" style={styles.label}>
                Related Prediction ID (optional)
              </label>
              <input
                id="prediction_id"
                name="prediction_id"
                type="number"
                min="1"
                value={form.prediction_id}
                onChange={handleChange}
                disabled={Boolean(editingId)}
                placeholder="Enter prediction ID"
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            <label htmlFor="description" style={styles.label}>
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              maxLength={5000}
              rows={4}
              placeholder="Describe the planned HR follow-up action..."
              style={{ ...styles.input, resize: "vertical" }}
            />
          </div>

          <div style={{ marginTop: "16px" }}>
            <label htmlFor="outcome" style={styles.label}>
              Outcome / Follow-up Notes
            </label>
            <textarea
              id="outcome"
              name="outcome"
              value={form.outcome}
              onChange={handleChange}
              maxLength={5000}
              rows={3}
              placeholder="Record the outcome when available..."
              style={{ ...styles.input, resize: "vertical" }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "18px",
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.button,
                ...styles.primary,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Create Intervention"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  ...styles.button,
                  ...styles.secondary,
                }}
              >
                Cancel Edit
              </button>
            )}

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              style={{
                ...styles.button,
                ...styles.secondary,
              }}
            >
              {loading ? "Refreshing..." : "Refresh Records"}
            </button>
          </div>
        </form>
      </section>

      <section style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ margin: 0 }}>Intervention Records</h2>

          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{ ...styles.input, width: "190px" }}
          >
            <option value="">All Statuses</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        </div>

        {loading ? (
          <p>Loading interventions...</p>
        ) : visibleInterventions.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            No interventions found for this filter.
          </p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    "ID",
                    "Employee ID",
                    "Intervention",
                    "Assigned To",
                    "Status",
                    "Priority",
                    "Follow-up",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading} style={styles.cell}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {visibleInterventions.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.cell}>{item.id}</td>
                    <td style={styles.cell}>{item.employee_id}</td>
                    <td style={styles.cell}>
                      <strong>{item.intervention_type}</strong>
                      <div
                        style={{
                          color: "#64748b",
                          marginTop: "5px",
                          maxWidth: "260px",
                          whiteSpace: "normal",
                        }}
                      >
                        {item.description}
                      </div>
                    </td>
                    <td style={styles.cell}>
                      {item.assigned_to || "Unassigned"}
                    </td>
                    <td style={styles.cell}>{item.status}</td>
                    <td style={styles.cell}>{item.priority}</td>
                    <td style={styles.cell}>
                      {formatDate(item.follow_up_date)}
                    </td>
                    <td style={styles.cell}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          style={{
                            ...styles.button,
                            ...styles.secondary,
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          style={{
                            ...styles.button,
                            ...styles.danger,
                          }}
                        >
                          Delete
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
    </main>
  );
}
