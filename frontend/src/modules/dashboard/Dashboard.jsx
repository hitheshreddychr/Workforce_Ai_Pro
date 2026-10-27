
import React, { useEffect, useMemo, useState } from "react";
import "./Dashboard.css";

import Employees from "../employees/Employees";
import Attendance from "../attendance/Attendance";
import Leave from "../leave/Leave";
import Payroll from "../payroll/Payroll";
import Performance from "../performance/Performance";
import Attrition from "../attrition/Attrition";
import Interventions from "../interventions/Interventions";

const API_BASE = "http://127.0.0.1:8001";

const menu = [
  "Dashboard",
  "Employees",
  "Attendance",
  "Leave Management",
  "Payroll",
  "Performance",
  "Attrition AI",
  "HR Interventions",
  "Reports",
  "Settings",
];

const icons = ["▦", "♙", "◷", "▣", "₹", "☆", "⌁", "♡", "▤", "⚙"];

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameDate(value, dateString) {
  if (!value) return false;
  return String(value).slice(0, 10) === dateString;
}

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0.00";
  }

  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Dashboard({ activePage, setActivePage }) {
  const [employees, setEmployees] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const today = getLocalDateString();

  async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
  }

  async function loadDashboardData() {
    setDashboardLoading(true);
    setDashboardError("");

    const attendanceUrl = new URL(`${API_BASE}/attendance/`);
    attendanceUrl.searchParams.set("attendance_date", today);

    const results = await Promise.allSettled([
      fetchJson(`${API_BASE}/employees/`),
      fetchJson(`${API_BASE}/attrition/`),
      fetchJson(attendanceUrl.toString()),
      fetchJson(`${API_BASE}/leave/`),
      fetchJson(`${API_BASE}/payroll/`),
    ]);

    const errors = [];

    if (results[0].status === "fulfilled") {
      setEmployees(
        Array.isArray(results[0].value) ? results[0].value : []
      );
    } else {
      setEmployees([]);
      errors.push("Employee data could not be loaded.");
    }

    if (results[1].status === "fulfilled") {
      setPredictions(
        Array.isArray(results[1].value) ? results[1].value : []
      );
    } else {
      setPredictions([]);
      errors.push("Attrition predictions could not be loaded.");
    }

    if (results[2].status === "fulfilled") {
      setAttendanceRecords(
        Array.isArray(results[2].value) ? results[2].value : []
      );
    } else {
      setAttendanceRecords([]);
      errors.push("Attendance data could not be loaded.");
    }

    if (results[3].status === "fulfilled") {
      setLeaveRequests(
        Array.isArray(results[3].value) ? results[3].value : []
      );
    } else {
      setLeaveRequests([]);
      errors.push("Leave data could not be loaded.");
    }

    if (results[4].status === "fulfilled") {
      setPayrollRecords(
        Array.isArray(results[4].value) ? results[4].value : []
      );
    } else {
      setPayrollRecords([]);
      errors.push("Payroll data could not be loaded.");
    }

    setDashboardError(errors.join(" "));
    setDashboardLoading(false);
  }

  useEffect(() => {
    if (activePage === "Dashboard") {
      loadDashboardData();
    }
  }, [activePage]);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.is_active !== false),
    [employees]
  );

  const departmentData = useMemo(() => {
    const counts = {};

    activeEmployees.forEach((employee) => {
      const department = employee.department || "Unassigned";
      counts[department] = (counts[department] || 0) + 1;
    });

    const total = activeEmployees.length;

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percent: total ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [activeEmployees]);

  const presentToday = useMemo(() => {
    const presentEmployeeIds = new Set();

    attendanceRecords.forEach((record) => {
      const status = String(record.status || "").trim().toLowerCase();

      if (
        isSameDate(record.attendance_date, today) &&
        status === "present" &&
        record.employee_id != null
      ) {
        presentEmployeeIds.add(String(record.employee_id));
      }
    });

    return presentEmployeeIds.size;
  }, [attendanceRecords, today]);

  const employeesOnLeave = useMemo(() => {
    const leaveEmployeeIds = new Set();

    leaveRequests.forEach((request) => {
      const status = String(request.status || "").trim().toLowerCase();
      const startDate = String(request.start_date || "").slice(0, 10);
      const endDate = String(request.end_date || "").slice(0, 10);

      if (
        status === "approved" &&
        startDate &&
        endDate &&
        startDate <= today &&
        endDate >= today &&
        request.employee_id != null
      ) {
        leaveEmployeeIds.add(String(request.employee_id));
      }
    });

    return leaveEmployeeIds.size;
  }, [leaveRequests, today]);

  const validProbabilities = predictions
    .map((prediction) => Number(prediction.attrition_probability))
    .filter(
      (value) => Number.isFinite(value) && value >= 0 && value <= 1
    );

  const averageRisk = validProbabilities.length
    ? (validProbabilities.reduce((sum, value) => sum + value, 0) /
        validProbabilities.length) *
      100
    : null;

  const payrollSummary = useMemo(() => {
    const totalNetSalary = payrollRecords.reduce((sum, record) => {
      const salary = Number(record.net_salary);
      return sum + (Number.isFinite(salary) ? salary : 0);
    }, 0);

    const pending = payrollRecords.filter(
      (record) =>
        String(record.status || "").trim().toLowerCase() === "pending"
    ).length;

    const paid = payrollRecords.filter(
      (record) =>
        String(record.status || "").trim().toLowerCase() === "paid"
    ).length;

    return {
      totalRecords: payrollRecords.length,
      totalNetSalary,
      pending,
      paid,
    };
  }, [payrollRecords]);

  const stats = [
    {
      title: "Total Employees",
      value:
        dashboardLoading && employees.length === 0
          ? "..."
          : String(activeEmployees.length),
      change: "Active employee records",
      icon: "👥",
    },
    {
      title: "Present Today",
      value:
        dashboardLoading && attendanceRecords.length === 0
          ? "..."
          : String(presentToday),
      change: `Attendance for ${today}`,
      icon: "✅",
    },
    {
      title: "On Leave",
      value:
        dashboardLoading && leaveRequests.length === 0
          ? "..."
          : String(employeesOnLeave),
      change: "Employees with approved leave today",
      icon: "🏖️",
    },
    {
      title: "Average Attrition Risk",
      value: averageRisk === null ? "—" : `${averageRisk.toFixed(1)}%`,
      change:
        averageRisk === null
          ? "No valid prediction scores available"
          : `Based on ${validProbabilities.length} saved prediction records`,
      icon: "📊",
    },
  ];

  function renderModule() {
    switch (activePage) {
      case "Dashboard":
        return (
          <>
            {dashboardError && (
              <div
                className="hr-panel"
                style={{ padding: 16, marginTop: 20 }}
              >
                <p style={{ color: "#dc3545", margin: 0 }}>
                  {dashboardError}
                </p>
              </div>
            )}

            <div style={{ marginTop: 16, marginBottom: 12 }}>
              <button
                className="hr-view-button"
                onClick={loadDashboardData}
                disabled={dashboardLoading}
              >
                {dashboardLoading ? "Refreshing..." : "↻ Refresh Dashboard"}
              </button>
            </div>

            <section className="hr-stat-grid">
              {stats.map((stat) => (
                <article className="hr-stat-card" key={stat.title}>
                  <div className="hr-stat-top">
                    <span>{stat.title}</span>
                    <span className="hr-stat-icon">{stat.icon}</span>
                  </div>
                  <h2>{stat.value}</h2>
                  <p>{stat.change}</p>
                </article>
              ))}
            </section>

            <section className="hr-panel" style={{ marginTop: 24, padding: 24 }}>
              <div className="hr-panel-heading">
                <div>
                  <h3>Payroll Overview</h3>
                  <p>Live payroll records retrieved from the backend</p>
                </div>
                <span className="hr-tag">
                  {dashboardLoading ? "Loading..." : `${payrollSummary.totalRecords} Records`}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 16,
                  marginTop: 20,
                }}
              >
                <article className="hr-stat-card">
                  <div className="hr-stat-top">
                    <span>Payroll Records</span>
                    <span className="hr-stat-icon">📋</span>
                  </div>
                  <h2>{payrollSummary.totalRecords}</h2>
                  <p>Records returned by the payroll API</p>
                </article>

                <article className="hr-stat-card">
                  <div className="hr-stat-top">
                    <span>Total Net Salary</span>
                    <span className="hr-stat-icon">₹</span>
                  </div>
                  <h2 style={{ fontSize: 24 }}>
                    {formatCurrency(payrollSummary.totalNetSalary)}
                  </h2>
                  <p>Sum of net salary across returned records</p>
                </article>

                <article className="hr-stat-card">
                  <div className="hr-stat-top">
                    <span>Pending Payroll</span>
                    <span className="hr-stat-icon">⏳</span>
                  </div>
                  <h2 style={{ color: "#d97706" }}>
                    {payrollSummary.pending}
                  </h2>
                  <p>Records awaiting payment</p>
                </article>

                <article className="hr-stat-card">
                  <div className="hr-stat-top">
                    <span>Paid Payroll</span>
                    <span className="hr-stat-icon">✅</span>
                  </div>
                  <h2 style={{ color: "#059669" }}>
                    {payrollSummary.paid}
                  </h2>
                  <p>Records marked as paid</p>
                </article>
              </div>

              <div style={{ marginTop: 20 }}>
                <button
                  className="hr-view-button"
                  onClick={() => setActivePage("Payroll")}
                >
                  Open Payroll Management →
                </button>
              </div>
            </section>

            <section className="hr-content-grid">
              <article className="hr-panel hr-department-panel">
                <div className="hr-panel-heading">
                  <div>
                    <h3>Department Overview</h3>
                    <p>Active employee distribution by department</p>
                  </div>
                  <span className="hr-tag">
                    {departmentData.length} Departments
                  </span>
                </div>

                {departmentData.length === 0 ? (
                  <p>
                    {dashboardLoading
                      ? "Loading department data..."
                      : "No active employee records available."}
                  </p>
                ) : (
                  <div className="hr-department-list">
                    {departmentData.map((department) => (
                      <div className="hr-department" key={department.name}>
                        <div className="hr-department-label">
                          <strong>{department.name}</strong>
                          <span>{department.count} employees</span>
                        </div>
                        <div className="hr-progress">
                          <div
                            style={{ width: `${department.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="hr-panel hr-risk-panel">
                <div className="hr-panel-heading">
                  <div>
                    <h3>Attrition Intelligence</h3>
                    <p>Average saved prediction score</p>
                  </div>
                  <span className="hr-ai-badge">✦ AI</span>
                </div>

                <div className="hr-risk-number">
                  {averageRisk === null ? "—" : `${averageRisk.toFixed(1)}%`}
                  <span>
                    {averageRisk === null ? "No data" : "prediction average"}
                  </span>
                </div>

                <div className="hr-risk-track">
                  <div
                    style={{
                      width: `${averageRisk === null ? 0 : averageRisk}%`,
                    }}
                  />
                </div>

                <p className="hr-risk-note">
                  {predictions.length > 0
                    ? "Average of valid saved prediction scores, not a verified company-wide turnover rate."
                    : "No saved attrition predictions are available. Run an attrition assessment to populate this section."}
                </p>

                <div className="hr-risk-footer">
                  <span>Saved predictions</span>
                  <strong>{predictions.length}</strong>
                </div>
              </article>
            </section>

            <section
              className="hr-panel hr-activity-panel"
              style={{ marginTop: 24 }}
            >
              <div className="hr-panel-heading">
                <div>
                  <h3>Recent HR Activity</h3>
                  <p>Activity feed integration is still pending</p>
                </div>
              </div>
              <p>
                Recent activity will appear here when an activity or audit-log
                API is connected.
              </p>
            </section>
          </>
        );

      case "Employees":
        return <Employees />;

      case "Attendance":
        return <Attendance />;

      case "Leave Management":
        return <Leave />;

      case "Payroll":
        return <Payroll />;

      case "Performance":
        return <Performance />;

      case "Attrition AI":
        return <Attrition />;

      case "HR Interventions":
        return <Interventions />;

      case "Reports":
        return (
          <section
            className="hr-panel"
            style={{ padding: 24, marginTop: 24 }}
          >
            <h3>Reports</h3>
            <p>The Reports module is ready to be connected.</p>
          </section>
        );

      case "Settings":
        return (
          <section
            className="hr-panel"
            style={{ padding: 24, marginTop: 24 }}
          >
            <h3>Settings</h3>
            <p>The Settings module is ready to be connected.</p>
          </section>
        );

      default:
        return <p>Select a module from the sidebar.</p>;
    }
  }

  return (
    <div className="hr-dashboard">
      <aside className="hr-sidebar">
        <h2 className="hr-logo">
          WorkForce<span>AI</span>
        </h2>

        <p className="hr-menu-label">WORKSPACE</p>

        {menu.map((item, index) => (
          <button
            key={item}
            className={`hr-nav-item ${activePage === item ? "active" : ""}`}
            onClick={() => setActivePage(item)}
            aria-current={activePage === item ? "page" : undefined}
          >
            <span>{icons[index]}</span>
            {item}
          </button>
        ))}

        <div className="hr-sidebar-bottom">
          <div className="hr-avatar">HR</div>
          <div>
            <strong>HR Administrator</strong>
            <small>Administrator</small>
          </div>
        </div>
      </aside>

      <main className="hr-main">
        {activePage === "Dashboard" ? (
          <header className="hr-topbar">
            <div>
              <span className="hr-eyebrow">WORKFORCE OVERVIEW</span>
              <h1>HR Dashboard</h1>
              <p>
                Welcome back! Here's what's happening with your workforce.
              </p>
            </div>

            <div className="hr-top-actions">
              <button className="hr-icon-button" aria-label="Notifications">
                ♧
              </button>
              <span className="hr-today">● System Online</span>
            </div>
          </header>
        ) : (
          <header className="hr-topbar">
            <div>
              <span className="hr-eyebrow">WORKFORCE MANAGEMENT</span>
              <h1>{activePage}</h1>
            </div>
          </header>
        )}

        {renderModule()}

        <footer className="hr-footer">
          WorkForce AI Pro{" "}
          <span>
            HR Attrition Prediction &amp; Workforce Intelligence Platform
          </span>
        </footer>
      </main>
    </div>
  );
}
