
import { useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8001/performance/";

const initialForm = {
  employee_id: "",
  review_period: "",
  rating: "3",
  feedback: "",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  border: "1px solid #d8deeb",
  borderRadius: "8px",
  boxSizing: "border-box",
  fontSize: "14px",
};

const buttonStyle = {
  padding: "9px 14px",
  border: "none",
  borderRadius: "7px",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

export default function Performance() {
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [reviewResponse, employeeResponse] = await Promise.all([
        fetch(API_URL),
        fetch("http://127.0.0.1:8001/employees/"),
      ]);

      if (!reviewResponse.ok) {
        throw new Error("Could not load performance reviews.");
      }

      const reviewData = await reviewResponse.json();
      setReviews(Array.isArray(reviewData) ? reviewData : []);

      if (employeeResponse.ok) {
        const employeeData = await employeeResponse.json();
        setEmployees(Array.isArray(employeeData) ? employeeData : []);
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the backend. Check that the server is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredReviews = useMemo(() => {
    const term = search.toLowerCase();

    return reviews.filter((review) =>
      Object.values(review).some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  }, [reviews, search]);

  function openAddForm() {
    setEditingId(null);
    setForm(initialForm);
    setShowForm(true);
    setError("");
  }

  function openEditForm(review) {
    setEditingId(review.id);
    setForm({
      employee_id: String(review.employee_id ?? ""),
      review_period: review.review_period ?? "",
      rating: String(review.rating ?? 3),
      feedback: review.feedback ?? "",
    });
    setShowForm(true);
    setError("");
  }

  async function saveReview(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      employee_id: Number(form.employee_id),
      review_period: form.review_period,
      rating: Number(form.rating),
      feedback: form.feedback,
    };

    try {
      const response = await fetch(
        editingId !== null
          ? `${API_URL}${editingId}`
          : API_URL,
        {
          method: editingId !== null ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(
          details?.detail
            ? JSON.stringify(details.detail)
            : "Could not save the review. Check the required API fields."
        );
      }

      setShowForm(false);
      setEditingId(null);
      setForm(initialForm);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save the review.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteReview(review) {
    if (!window.confirm(`Delete performance review #${review.id}?`)) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`${API_URL}${review.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(
          details?.detail || "Could not delete this review."
        );
      }

      await loadData();
    } catch (err) {
      setError(String(err.message || "Unable to delete the review."));
    }
  }

  function employeeName(employeeId) {
    const employee = employees.find(
      (item) => Number(item.id) === Number(employeeId)
    );

    return employee
      ? employee.full_name || employee.name || `Employee ${employeeId}`
      : `Employee ${employeeId ?? "—"}`;
  }

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e0e7f5",
    borderRadius: "12px",
    padding: "20px",
  };

  return (
    <div
      style={{
        padding: "24px",
        background: "#f5f7fc",
        minHeight: "calc(100vh - 65px)",
        color: "#172033",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <div>
          <p
            style={{
              color: "#6554f0",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "2px",
            }}
          >
            WORKFORCE OVERVIEW
          </p>
          <h1 style={{ margin: "8px 0", fontSize: "28px" }}>
            Performance Management
          </h1>
          <p style={{ color: "#718096", margin: 0 }}>
            Review employee performance, ratings, and feedback.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          style={{ ...buttonStyle, background: "#6554f0" }}
        >
          + Add Review
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: "13px",
            marginBottom: "20px",
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            color: "#b91c1c",
            borderRadius: "8px",
            overflowWrap: "anywhere",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {[
          { label: "Total Reviews", value: reviews.length, color: "#172033" },
          {
            label: "Average Rating",
            value: reviews.length
              ? (
                  reviews.reduce(
                    (sum, review) => sum + (Number(review.rating) || 0),
                    0
                  ) / reviews.length
                ).toFixed(1)
              : "0.0",
            color: "#6554f0",
          },
          {
            label: "Employees Reviewed",
            value: new Set(reviews.map((review) => review.employee_id)).size,
            color: "#059669",
          },
        ].map((item) => (
          <div key={item.label} style={cardStyle}>
            <p style={{ margin: "0 0 12px", color: "#718096", fontSize: "13px" }}>
              {item.label}
            </p>
            <h2 style={{ margin: 0, color: item.color, fontSize: "26px" }}>
              {item.value}
            </h2>
          </div>
        ))}
      </div>

      {showForm && (
        <form
          onSubmit={saveReview}
          style={{ ...cardStyle, marginBottom: "24px" }}
        >
          <h2 style={{ marginTop: 0 }}>
            {editingId !== null ? "Edit Review" : "Add Performance Review"}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <label>
              <span>Employee</span>
              <select
                required
                value={form.employee_id}
                onChange={(event) =>
                  setForm({ ...form, employee_id: event.target.value })
                }
                style={{ ...inputStyle, marginTop: "7px" }}
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

            <label>
              <span>Review Period</span>
              <input
                required
                value={form.review_period}
                onChange={(event) =>
                  setForm({ ...form, review_period: event.target.value })
                }
                placeholder="e.g. 2026-Q4"
                style={{ ...inputStyle, marginTop: "7px" }}
              />
            </label>

            <label>
              <span>Rating (1–5)</span>
              <select
                required
                value={form.rating}
                onChange={(event) =>
                  setForm({ ...form, rating: event.target.value })
                }
                style={{ ...inputStyle, marginTop: "7px" }}
              >
                <option value="1">1 - Needs Improvement</option>
                <option value="2">2 - Below Expectations</option>
                <option value="3">3 - Meets Expectations</option>
                <option value="4">4 - Exceeds Expectations</option>
                <option value="5">5 - Outstanding</option>
              </select>
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span>Feedback</span>
              <textarea
                value={form.feedback}
                onChange={(event) =>
                  setForm({ ...form, feedback: event.target.value })
                }
                rows={3}
                placeholder="Enter employee performance feedback"
                style={{ ...inputStyle, marginTop: "7px", resize: "vertical" }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...buttonStyle,
                background: "#6554f0",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : editingId !== null ? "Update Review" : "Save Review"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(initialForm);
              }}
              style={{ ...buttonStyle, background: "#64748b" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: "20px" }}>
              Performance Reviews
            </h2>
            <p style={{ margin: 0, color: "#718096", fontSize: "13px" }}>
              View and manage employee reviews.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            style={{ ...buttonStyle, background: "#475569" }}
          >
            Refresh
          </button>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reviews..."
          style={{ ...inputStyle, marginBottom: "16px" }}
        />

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: "850px",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ background: "#f0efff", textAlign: "left" }}>
                {[
                  "ID",
                  "Employee",
                  "Review Period",
                  "Rating",
                  "Feedback",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{ padding: "13px 12px", whiteSpace: "nowrap" }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "28px", textAlign: "center" }}>
                    Loading reviews...
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "28px", textAlign: "center" }}>
                    No performance reviews found.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => (
                  <tr key={review.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "14px 12px" }}>{review.id}</td>
                    <td style={{ padding: "14px 12px" }}>
                      {employeeName(review.employee_id)}
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      {review.review_period ?? "—"}
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      {review.rating ?? "—"} / 5
                    </td>
                    <td style={{ padding: "14px 12px", maxWidth: "260px" }}>
                      {review.feedback ?? "—"}
                    </td>
                    <td style={{ padding: "14px 12px", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        onClick={() => openEditForm(review)}
                        style={{
                          ...buttonStyle,
                          background: "#2563eb",
                          marginRight: "7px",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteReview(review)}
                        style={{ ...buttonStyle, background: "#dc2626" }}
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
    </div>
  );
}
