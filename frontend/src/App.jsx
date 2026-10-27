
import { useState } from "react";
import Dashboard from "./modules/dashboard/Dashboard";

export const WORKFORCE_PAGES = [
  "Dashboard",
  "Employees",
  "Attendance",
  "Leave Management",
  "Payroll",
  "Performance",
  "Attrition AI",
  "HR Interventions",
];

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  return (
    <Dashboard
      activePage={activePage}
      setActivePage={setActivePage}
    />
  );
}
