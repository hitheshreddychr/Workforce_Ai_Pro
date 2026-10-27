
import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8001/attrition/";
const EMPLOYEE_API = "http://127.0.0.1:8001/employees/";

function calculateYearsAtCompany(hireDate) {
  if (!hireDate) return "";

  const start = new Date(`${hireDate}T00:00:00`);
  const today = new Date();

  if (Number.isNaN(start.getTime()) || start > today) return "";

  let years = today.getFullYear() - start.getFullYear();
  const monthDifference = today.getMonth() - start.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < start.getDate())
  ) {
    years--;
  }

  return Math.max(0, years);
}

export default function Attrition() {
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [satisfaction, setSatisfaction] = useState("3");
  const [overtime, setOvertime] = useState("No");
  const [years, setYears] = useState("");
  const [income, setIncome] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const selectedEmployee = employees.find(
    (employee) => String(employee.id) === String(employeeId)
  );

  const loadEmployees = async () => {
    setEmployeesLoading(true);

    try {
      const response = await fetch(EMPLOYEE_API);

      if (!response.ok) {
        throw new Error("Could not load employees.");
      }

      const data = await response.json();

      setEmployees(
        Array.isArray(data)
          ? data.filter((employee) => employee.is_active !== false)
          : []
      );
    } catch (err) {
      setMessage(err.message || "Could not load employees.");
      setError(true);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const loadPredictions = async () => {
    try {
      const response = await fetch(API);

      if (!response.ok) {
        throw new Error("Could not load prediction history.");
      }

      const data = await response.json();
      setPredictions(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage(err.message || "Cannot connect to the backend.");
      setError(true);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadPredictions();
  }, []);

  useEffect(() => {
    if (!selectedEmployee) {
      setYears("");
      setIncome("");
      return;
    }

    const annualSalary = Number(selectedEmployee.salary);

    setIncome(
      selectedEmployee.salary != null &&
        Number.isFinite(annualSalary) &&
        annualSalary > 0
        ? (annualSalary / 12).toFixed(2)
        : ""
    );

    const calculatedYears = calculateYearsAtCompany(
      selectedEmployee.hire_date
    );

    setYears(
      calculatedYears === "" ? "" : String(calculatedYears)
    );
  }, [employeeId, employees]);

  const assessRisk = async (event) => {
    event.preventDefault();

    if (!selectedEmployee) {
      setMessage("Please select an active employee.");
      setError(true);
      return;
    }

    if (
      income === "" ||
      !Number.isFinite(Number(income)) ||
      Number(income) <= 0
    ) {
      setMessage("Enter a valid monthly income before assessing.");
      setError(true);
      return;
    }

    if (
      years === "" ||
      !Number.isFinite(Number(years)) ||
      Number(years) < 0
    ) {
      setMessage("Enter valid years at company before assessing.");
      setError(true);
      return;
    }

    setLoading(true);
    setMessage("");
    setError(false);
    setResult(null);

    try {
      const response = await fetch(`${API}assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: Number(employeeId),
          satisfaction: Number(satisfaction),
          overtime,
          years_at_company: Number(years),
          monthly_income: Number(income),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail || "Assessment failed.")
        );
      }

      setResult(data);
      setMessage("ML assessment completed and saved successfully.");
      setError(false);
      await loadPredictions();
    } catch (err) {
      setMessage(err.message || "Assessment failed.");
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const deletePrediction = async (id) => {
    if (!window.confirm("Delete this prediction?")) return;

    try {
      const response = await fetch(`${API}${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not delete prediction.");
      }

      if (result?.id === id) {
        setResult(null);
      }

      setMessage("Prediction deleted successfully.");
      setError(false);
      await loadPredictions();
    } catch (err) {
      setMessage(err.message || "Could not delete prediction.");
      setError(true);
    }
  };

  // Overall risk distribution.
  const riskCounts = {
    Low: predictions.filter((item) => item.risk_level === "Low").length,
    Medium: predictions.filter((item) => item.risk_level === "Medium").length,
    High: predictions.filter((item) => item.risk_level === "High").length,
  };

  const highRisk = riskCounts.High;

  const averageRisk = predictions.length
    ? Math.round(
        (predictions.reduce(
          (total, item) =>
            total + Number(item.attrition_probability || 0),
          0
        ) /
          predictions.length) *
          100
      )
    : 0;

  const maxRiskCount = Math.max(
    riskCounts.Low,
    riskCounts.Medium,
    riskCounts.High,
    1
  );

  // Department-wise prediction analysis.
  const departmentStats = Object.values(
    predictions.reduce((groups, item) => {
      const department = item.department || "Not specified";

      if (!groups[department]) {
        groups[department] = {
          department,
          total: 0,
          Low: 0,
          Medium: 0,
          High: 0,
          probabilityTotal: 0,
        };
      }

      const group = groups[department];

      group.total += 1;
      group.probabilityTotal += Number(
        item.attrition_probability || 0
      );

      if (["Low", "Medium", "High"].includes(item.risk_level)) {
        group[item.risk_level] += 1;
      }

      return groups;
    }, {})
  )
    .map((group) => ({
      ...group,
      averageProbability:
        group.total > 0
          ? (group.probabilityTotal / group.total) * 100
          : 0,
    }))
    .sort((a, b) => a.department.localeCompare(b.department));

  // Employee Trend Reports: group prediction history by date.
  const dailyTrendStats = Object.values(
    predictions.reduce((groups, item) => {
      if (!item.prediction_date) return groups;

      const date = new Date(item.prediction_date);

      if (Number.isNaN(date.getTime())) return groups;

      const dateKey = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          total: 0,
          probabilityTotal: 0,
        };
      }

      groups[dateKey].total += 1;
      groups[dateKey].probabilityTotal += Number(
        item.attrition_probability || 0
      );

      return groups;
    }, {})
  )
    .map((day) => ({
      ...day,
      averageProbability:
        day.total > 0
          ? (day.probabilityTotal / day.total) * 100
          : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const maxDailyPredictions = Math.max(
    ...dailyTrendStats.map((day) => day.total),
    1
  );

  const cardStyle = {
    background: "#fff",
    padding: 20,
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 15px #1018280d",
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: 11,
    marginTop: 7,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#fff",
    color: "#172033",
  };

  const buttonStyle = {
    padding: "11px 18px",
    border: 0,
    borderRadius: 8,
    background: "#6554f0",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  };

  const riskColor = (risk) =>
    risk === "High"
      ? "#dc2626"
      : risk === "Medium"
        ? "#b45309"
        : "#15803d";

  const cellStyle = {
    padding: 12,
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "top",
  };

  return (
    <main
      style={{
        padding: 28,
        background: "#f5f7fb",
        minHeight: "100vh",
        color: "#172033",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Attrition AI</h1>

      <p style={{ color: "#667085" }}>
        Employee retention risk dashboard
      </p>

      <p
        style={{
          background: "#fff7e6",
          padding: 12,
          borderRadius: 8,
          color: "#854d0e",
          fontSize: 13,
        }}
      >
        Prototype model trained on synthetic data. Results are
        experimental and must not be used to make employment decisions.
      </p>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          margin: "24px 0",
        }}
      >
        <div style={cardStyle}>
          <p>Total Predictions</p>
          <h2>{predictions.length}</h2>
        </div>

        <div style={cardStyle}>
          <p>High-Risk Records</p>
          <h2 style={{ color: "#dc2626" }}>{highRisk}</h2>
        </div>

        <div style={cardStyle}>
          <p>Average Model Score</p>
          <h2>{averageRisk}%</h2>
        </div>
      </div>

      {/* Risk Distribution Analytics */}
      <section style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Risk Distribution Analytics</h2>

        <p style={{ color: "#667085", fontSize: 14 }}>
          Counts of saved prediction records by risk level. Multiple
          predictions for one employee are counted separately.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 14,
            margin: "20px 0 28px",
          }}
        >
          {[
            {
              label: "Low Risk",
              key: "Low",
              color: "#15803d",
              bg: "#f0fdf4",
            },
            {
              label: "Medium Risk",
              key: "Medium",
              color: "#b45309",
              bg: "#fffbeb",
            },
            {
              label: "High Risk",
              key: "High",
              color: "#dc2626",
              bg: "#fef2f2",
            },
          ].map((risk) => (
            <div
              key={risk.key}
              style={{
                padding: 18,
                borderRadius: 12,
                background: risk.bg,
                border: `1px solid ${risk.color}33`,
              }}
            >
              <p style={{ color: risk.color, margin: 0, fontWeight: 600 }}>
                {risk.label}
              </p>

              <h2
                style={{
                  color: risk.color,
                  fontSize: 30,
                  margin: "10px 0",
                }}
              >
                {riskCounts[risk.key]}
              </h2>

              <p style={{ color: "#667085", margin: 0, fontSize: 12 }}>
                {predictions.length
                  ? `${(
                      (riskCounts[risk.key] / predictions.length) *
                      100
                    ).toFixed(1)}% of records`
                  : "No records yet"}
              </p>
            </div>
          ))}
        </div>

        <h3>Prediction Count by Risk Level</h3>

        {[
          { label: "Low Risk", key: "Low", color: "#16a34a" },
          { label: "Medium Risk", key: "Medium", color: "#d97706" },
          { label: "High Risk", key: "High", color: "#dc2626" },
        ].map((risk) => (
          <div key={risk.key} style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 7,
                fontSize: 14,
              }}
            >
              <span>{risk.label}</span>
              <strong>{riskCounts[risk.key]}</strong>
            </div>

            <div
              role="img"
              aria-label={`${risk.label}: ${riskCounts[risk.key]} prediction records`}
              style={{
                width: "100%",
                height: 14,
                background: "#e5e7eb",
                borderRadius: 20,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${
                    (riskCounts[risk.key] / maxRiskCount) * 100
                  }%`,
                  background: risk.color,
                  borderRadius: 20,
                  transition: "width 0.35s ease",
                }}
              />
            </div>
          </div>
        ))}

        {predictions.length === 0 && (
          <p style={{ color: "#667085" }}>
            Complete an assessment to populate this chart.
          </p>
        )}
      </section>

      {/* Department-Wise Attrition Analysis */}
      <section style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>
          Department-Wise Attrition Analysis
        </h2>

        <p style={{ color: "#667085", fontSize: 14 }}>
          Compare saved prediction counts and average model scores across
          departments. These are model estimates, not actual employee
          turnover rates. Multiple assessments of one employee count
          as separate records.
        </p>

        {departmentStats.length === 0 ? (
          <p style={{ color: "#667085" }}>
            No prediction records are available for department analysis yet.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 750,
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    "Department",
                    "Total Predictions",
                    "Low Risk",
                    "Medium Risk",
                    "High Risk",
                    "Average Model Score",
                  ].map((heading) => (
                    <th key={heading} style={cellStyle}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {departmentStats.map((department) => (
                  <tr key={department.department}>
                    <td style={cellStyle}>
                      <strong>{department.department}</strong>
                    </td>
                    <td style={cellStyle}>{department.total}</td>
                    <td style={{ ...cellStyle, color: "#15803d" }}>
                      {department.Low}
                    </td>
                    <td style={{ ...cellStyle, color: "#b45309" }}>
                      {department.Medium}
                    </td>
                    <td style={{ ...cellStyle, color: "#dc2626" }}>
                      {department.High}
                    </td>
                    <td style={cellStyle}>
                      {department.averageProbability.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Employee Trend Reports — Module 15 */}
      <section style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Employee Trend Reports</h2>

        <p style={{ color: "#667085", fontSize: 14 }}>
          Daily prediction volume and average estimated attrition
          probability based on saved prediction history.
        </p>

        {dailyTrendStats.length === 0 ? (
          <p style={{ color: "#667085" }}>
            No dated prediction records are available yet.
          </p>
        ) : (
          <>
            <h3>Daily Prediction Volume</h3>

            {dailyTrendStats.map((day) => (
              <div key={day.date} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 7,
                    fontSize: 14,
                  }}
                >
                  <span>{day.date}</span>
                  <strong>
                    {day.total} prediction{day.total === 1 ? "" : "s"}
                  </strong>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: 12,
                    background: "#e5e7eb",
                    borderRadius: 20,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${
                        (day.total / maxDailyPredictions) * 100
                      }%`,
                      height: "100%",
                      background: "#6554f0",
                      borderRadius: 20,
                    }}
                  />
                </div>
              </div>
            ))}

            <h3 style={{ marginTop: 28 }}>
              Average Estimated Attrition Probability by Date
            </h3>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 450,
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={cellStyle}>Date</th>
                    <th style={cellStyle}>Predictions</th>
                    <th style={cellStyle}>Average Probability</th>
                  </tr>
                </thead>

                <tbody>
                  {dailyTrendStats.map((day) => (
                    <tr key={day.date}>
                      <td style={cellStyle}>{day.date}</td>
                      <td style={cellStyle}>{day.total}</td>
                      <td style={cellStyle}>
                        {day.averageProbability.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p
              style={{
                color: "#667085",
                fontSize: 12,
                lineHeight: 1.6,
                marginTop: 16,
              }}
            >
              These trends summarize saved model predictions, not confirmed
              employee departures. Multiple predictions for the same
              employee are counted separately. Historical patterns may be
              limited if few dates have records.
            </p>
          </>
        )}
      </section>

      {/* ML Assessment Form */}
      <section
        style={{
          ...cardStyle,
          maxWidth: 700,
          marginBottom: 24,
        }}
      >
        <h2>ML Risk Assessment</h2>

        <p style={{ color: "#667085", fontSize: 14 }}>
          Select an active employee. Salary and years at company are
          filled from the employee record when available.
        </p>

        <form onSubmit={assessRisk}>
          <label>
            Select Employee
            <select
              style={inputStyle}
              value={employeeId}
              onChange={(event) => {
                setEmployeeId(event.target.value);
                setMessage("");
                setError(false);
              }}
              required
              disabled={employeesLoading || employees.length === 0}
            >
              <option value="">
                {employeesLoading
                  ? "Loading employees..."
                  : employees.length === 0
                    ? "No active employees available"
                    : "Choose an employee"}
              </option>

              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} — {employee.department} (ID:{" "}
                  {employee.id})
                </option>
              ))}
            </select>
          </label>

          {selectedEmployee && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                border: "1px solid #e0e7ff",
                borderRadius: 10,
                background: "#f8faff",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Selected Employee Details</h3>
              <p>
                <strong>Name:</strong> {selectedEmployee.full_name}
              </p>
              <p>
                <strong>Department:</strong> {selectedEmployee.department}
              </p>
              <p>
                <strong>Job Title:</strong> {selectedEmployee.job_title}
              </p>
              <p>
                <strong>Annual Salary:</strong>{" "}
                {selectedEmployee.salary != null
                  ? `₹${Number(selectedEmployee.salary).toLocaleString(
                      "en-IN"
                    )}`
                  : "Not available"}
              </p>
              <p>
                <strong>Hire Date:</strong>{" "}
                {selectedEmployee.hire_date || "Not available"}
              </p>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            <label>
              Job Satisfaction (1–5)
              <select
                style={inputStyle}
                value={satisfaction}
                onChange={(event) => setSatisfaction(event.target.value)}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Works Overtime?
              <select
                style={inputStyle}
                value={overtime}
                onChange={(event) => setOvertime(event.target.value)}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </label>

            <label>
              Years at Company
              <input
                style={inputStyle}
                type="number"
                min="0"
                max="60"
                step="1"
                required
                value={years}
                onChange={(event) => setYears(event.target.value)}
                placeholder="Enter years if unavailable"
              />
            </label>

            <label>
              Monthly Income (₹)
              <input
                style={inputStyle}
                type="number"
                min="0.01"
                step="0.01"
                required
                value={income}
                onChange={(event) => setIncome(event.target.value)}
                placeholder="Monthly salary"
              />
            </label>
          </div>

          <p style={{ color: "#667085", fontSize: 12, lineHeight: 1.5 }}>
            Monthly income is calculated as annual salary ÷ 12. Years at
            company is calculated from the hire date. Verify the employee
            details before submitting.
          </p>

          <button
            type="submit"
            disabled={loading || employeesLoading || !selectedEmployee}
            style={{
              ...buttonStyle,
              marginTop: 12,
              opacity:
                loading || employeesLoading || !selectedEmployee ? 0.7 : 1,
            }}
          >
            {loading ? "Assessing..." : "Assess with ML Model"}
          </button>
        </form>

        {message && (
          <p
            role="status"
            style={{
              marginTop: 16,
              color: error ? "#dc2626" : "#15803d",
              overflowWrap: "anywhere",
            }}
          >
            {message}
          </p>
        )}

        {result && (
          <div
            style={{
              marginTop: 20,
              padding: 20,
              borderRadius: 12,
              border: `1px solid ${riskColor(result.risk_level)}55`,
              background: "#fff",
            }}
          >
            <p style={{ color: "#667085", margin: 0 }}>
              Latest ML Assessment · Employee{" "}
              {selectedEmployee?.id === result.employee_id
                ? selectedEmployee.full_name
                : result.employee_name || `ID ${result.employee_id}`}
            </p>

            <h2
              style={{
                color: riskColor(result.risk_level),
                marginBottom: 8,
              }}
            >
              {result.risk_level} Risk
            </h2>

            <h3>
              {(
                Number(result.attrition_probability || 0) * 100
              ).toFixed(1)}
              % estimated probability
            </h3>

            <div
              style={{
                height: 10,
                background: "#e5e7eb",
                borderRadius: 20,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      Number(result.attrition_probability || 0) * 100
                    )
                  )}%`,
                  background: riskColor(result.risk_level),
                  transition: "width 0.4s ease",
                }}
              />
            </div>

            <h3>Recommended Support Action</h3>

            <p style={{ lineHeight: 1.6 }}>
              {result.recommended_action ||
                "Continue regular employee engagement."}
            </p>

            <p style={{ color: "#667085", fontSize: 12 }}>
              Prediction ID: {result.id} · Experimental prototype result.
            </p>
          </div>
        )}
      </section>

      {/* Prediction History */}
      <section style={{ ...cardStyle, overflowX: "auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h2>Prediction History</h2>

          <button
            type="button"
            onClick={loadPredictions}
            style={{
              padding: "9px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        <table
          style={{
            width: "100%",
            minWidth: 1050,
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Prediction ID",
                "Employee Name",
                "Department",
                "Employee ID",
                "Risk Score",
                "Risk Level",
                "Date",
                "Action",
              ].map((heading) => (
                <th
                  key={heading}
                  style={{
                    padding: 12,
                    borderBottom: "1px solid #e5e7eb",
                    whiteSpace: "nowrap",
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {predictions.map((item) => (
              <tr key={item.id}>
                <td style={cellStyle}>{item.id}</td>

                <td style={cellStyle}>
                  <strong>
                    {item.employee_name || `Employee ${item.employee_id}`}
                  </strong>
                </td>

                <td style={cellStyle}>
                  {item.department || "Not specified"}
                </td>

                <td style={cellStyle}>{item.employee_id}</td>

                <td style={cellStyle}>
                  {(
                    Number(item.attrition_probability || 0) * 100
                  ).toFixed(1)}
                  %
                </td>

                <td style={cellStyle}>
                  <span
                    style={{
                      display: "inline-block",
                      color: riskColor(item.risk_level),
                      background:
                        item.risk_level === "High"
                          ? "#fef2f2"
                          : item.risk_level === "Medium"
                            ? "#fffbeb"
                            : "#f0fdf4",
                      padding: "5px 9px",
                      borderRadius: 20,
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {item.risk_level}
                  </span>
                </td>

                <td style={cellStyle}>
                  {item.prediction_date
                    ? new Date(item.prediction_date).toLocaleString()
                    : "—"}
                </td>

                <td style={cellStyle}>
                  <button
                    type="button"
                    onClick={() => deletePrediction(item.id)}
                    style={{
                      color: "#dc2626",
                      background: "#fff",
                      border: "1px solid #fecaca",
                      borderRadius: 6,
                      padding: "6px 9px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {predictions.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "#667085",
                  }}
                >
                  No predictions saved yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
