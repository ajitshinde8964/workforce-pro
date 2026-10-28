
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import "./App.css";

const API_URL = "http://localhost:8080/api/employees";
const AUTH_URL = "http://localhost:8080/api/auth/me";
const PAGE_SIZE = 5;

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  department: "",
  salary: "",
};

function IconButton({ label, className = "", onClick, children }) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function formatSalary(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export default function App() {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [authHeader, setAuthHeader] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);

  const [nameSearch, setNameSearch] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState({
    name: "",
    department: "",
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isAdmin = useMemo(
    () =>
      currentUser?.roles?.some(
        (role) => role === "ROLE_ADMIN" || role === "ADMIN"
      ) ?? false,
    [currentUser]
  );

  // Shared authenticated API request helper.
  const apiFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        ...options.headers,
        Authorization: authHeader,
      };

      if (options.body) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        throw new Error("Authentication failed. Please sign in again.");
      }

      if (response.status === 403) {
        throw new Error("You do not have permission to perform this action.");
      }

      if (!response.ok) {
        let message = `Request failed (${response.status}).`;

        try {
          const body = await response.json();
          message = body.message || body.error || message;
        } catch {
          // Response may not contain JSON.
        }

        throw new Error(message);
      }

      if (response.status === 204) {
        return null;
      }

      const contentType = response.headers.get("content-type") || "";
      return contentType.includes("application/json")
        ? response.json()
        : null;
    },
    [authHeader]
  );

  // Load one page of employees from the backend.
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
        sortBy: "id",
        direction: "asc",
      });

      if (activeSearch.name) {
        params.set("name", activeSearch.name);
      }

      if (activeSearch.department) {
        params.set("department", activeSearch.department);
      }

      const result = await apiFetch(
        `${API_URL}/search?${params.toString()}`
      );

      if (Array.isArray(result)) {
        setEmployees(result);
        setTotalElements(result.length);
        setTotalPages(result.length > 0 ? 1 : 0);
      } else {
        const content = result?.content ?? [];
        setEmployees(content);
        setTotalElements(result?.totalElements ?? content.length);
        setTotalPages(
          result?.totalPages ?? (content.length > 0 ? 1 : 0)
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [activeSearch, apiFetch, page]);

  useEffect(() => {
    if (authHeader && currentUser) {
      loadEmployees();
    }
  }, [authHeader, currentUser, loadEmployees]);

  // Authenticate against the backend and retrieve the user's roles.
  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoginLoading(true);

    const basicHeader = `Basic ${btoa(
      `${credentials.username}:${credentials.password}`
    )}`;

    try {
      const response = await fetch(AUTH_URL, {
        headers: { Authorization: basicHeader },
      });

      if (response.status === 401) {
        throw new Error("Incorrect username or password.");
      }

      if (response.status === 403) {
        throw new Error("Access denied for this account.");
      }

      if (!response.ok) {
        throw new Error(`Login failed (${response.status}).`);
      }

      const user = await response.json();

      if (!user.username || !Array.isArray(user.roles)) {
        throw new Error("Unexpected response from the authentication API.");
      }

      setAuthHeader(basicHeader);
      setCurrentUser(user);
      setPage(0);
      setActiveSearch({ name: "", department: "" });
      setNameSearch("");
      setDepartmentSearch("");
      setCredentials((previous) => ({
        ...previous,
        password: "",
      }));
      setNotice(`Welcome, ${user.username}!`);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot connect to backend. Check Spring Boot and CORS settings."
          : getErrorMessage(err)
      );
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    // Clears credentials held by this React application.
    // HTTP Basic does not invalidate credentials cached by the browser.
    setAuthHeader("");
    setCurrentUser(null);
    setEmployees([]);
    setTotalElements(0);
    setTotalPages(0);
    setPage(0);
    setActiveSearch({ name: "", department: "" });
    setNameSearch("");
    setDepartmentSearch("");
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowEmployeeForm(false);
    setViewingEmployee(null);
    setCredentials({ username: "", password: "" });
    setError("");
    setNotice("");
  }

  function openAddForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowEmployeeForm(true);
    setViewingEmployee(null);
    setError("");
    setNotice("");
  }

  function openEditForm(employee) {
    setForm({
      firstName: employee.firstName ?? "",
      lastName: employee.lastName ?? "",
      email: employee.email ?? "",
      department: employee.department ?? "",
      salary: String(employee.salary ?? ""),
    });
    setEditingId(employee.id);
    setShowEmployeeForm(true);
    setViewingEmployee(null);
    setError("");
    setNotice("");
  }

  async function handleSaveEmployee(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const salary = Number(form.salary);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!form.department.trim()) {
      setError("Department is required.");
      return;
    }

    if (
      form.salary.trim() === "" ||
      !Number.isFinite(salary) ||
      salary < 0
    ) {
      setError("Enter a valid, non-negative salary.");
      return;
    }

    const employee = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      department: form.department.trim(),
      salary,
    };

    try {
      if (editingId !== null) {
        await apiFetch(`${API_URL}/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(employee),
        });
        setNotice("Employee updated successfully.");
      } else {
        await apiFetch(API_URL, {
          method: "POST",
          body: JSON.stringify(employee),
        });
        setNotice("Employee added successfully.");
      }

      setShowEmployeeForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setPage(0);
      await loadEmployees();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDeleteEmployee(employee) {
    const confirmed = window.confirm(
      `Delete ${employee.firstName} ${employee.lastName}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiFetch(`${API_URL}/${employee.id}`, {
        method: "DELETE",
      });

      setNotice("Employee deleted successfully.");

      if (employees.length === 1 && page > 0) {
        setPage((previous) => previous - 1);
      } else {
        await loadEmployees();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function handleSearch(event) {
    event.preventDefault();
    setPage(0);
    setActiveSearch({
      name: nameSearch.trim(),
      department: departmentSearch.trim(),
    });
  }

  function handleRefresh() {
    setNameSearch("");
    setDepartmentSearch("");
    setActiveSearch({ name: "", department: "" });
    setPage(0);
    setError("");
    setNotice("");
  }

  // LOGIN PAGE
  if (!currentUser) {
    return (
      <main className="app-shell login-shell">
        <header className="brand-header">
          <div className="brand-mark">
            <BriefcaseBusiness size={27} />
          </div>
          <div>
            <h1>WorkForce Pro</h1>
            <p>Employee Management Dashboard</p>
          </div>
        </header>

        <section className="login-layout">
          <div className="login-intro">
            <span className="eyebrow">
              <ShieldCheck size={16} />
              PEOPLE. PERFORMANCE. PROGRESS.
            </span>

            <h2>Manage your workforce with confidence.</h2>

            <p>
              A simple, secure workspace to manage employee records and
              keep your team organized.
            </p>

            <div className="intro-feature">
              <Users size={20} />
              <span>One place for your employee information</span>
            </div>

            <div className="intro-feature">
              <ShieldCheck size={20} />
              <span>Role-based access powered by Spring Security</span>
            </div>
          </div>

          <form className="login-card" onSubmit={handleLogin}>
            <div className="login-card-icon">
              <ShieldCheck size={28} />
            </div>

            <h2>Welcome back</h2>
            <p className="muted">Sign in to access your workspace.</p>

            {error && <div className="alert alert-error">{error}</div>}

            <label htmlFor="username">Username</label>
            <input
              id="username"
              autoComplete="username"
              value={credentials.username}
              onChange={(event) =>
                setCredentials((previous) => ({
                  ...previous,
                  username: event.target.value,
                }))
              }
              placeholder="Enter your username"
              required
            />

            <label htmlFor="password">Password</label>
            <div className="password-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={credentials.password}
                onChange={(event) =>
                  setCredentials((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                placeholder="Enter your password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((previous) => !previous)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              className="primary-button login-submit"
              type="submit"
              disabled={loginLoading}
            >
              {loginLoading ? "Signing in..." : "Sign in"}
              {!loginLoading && <ChevronRight size={18} />}
            </button>

            <p className="login-footnote">
              <ShieldCheck size={14} />
              Protected by your organization's access rules.
            </p>
          </form>
        </section>

        <footer className="app-footer">
          WorkForce Pro · Employee Management
        </footer>
      </main>
    );
  }

  // DASHBOARD
  return (
    <main className="app-shell dashboard-shell">
      <header className="dashboard-header">
        <div className="brand-header dashboard-brand">
          <div className="brand-mark">
            <BriefcaseBusiness size={25} />
          </div>
          <div>
            <h1>WorkForce Pro</h1>
            <p>Employee Management Dashboard</p>
          </div>
        </div>

        <div className="user-controls">
          <div className="user-avatar">
            {(currentUser.username?.[0] ?? "U").toUpperCase()}
          </div>
          <div className="user-meta">
            <strong>{currentUser.username}</strong>
            <span>{isAdmin ? "Administrator" : "Standard user"}</span>
          </div>
          <button
            type="button"
            className="secondary-button logout-button"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      <section className="welcome-row">
        <div>
          <span className="eyebrow">WORKSPACE OVERVIEW</span>
          <h2>Employees</h2>
          <p>View and manage your organization's employee records.</p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="primary-button"
            onClick={openAddForm}
          >
            <PlusCircle size={18} />
            Add Employee
          </button>
        )}
      </section>

      {notice && (
        <div className="alert alert-success">
          <Activity size={17} />
          {notice}
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-icon stat-blue">
            <Users size={22} />
          </div>
          <div>
            <span>Total matching employees</span>
            <strong>{totalElements}</strong>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-icon stat-purple">
            <BriefcaseBusiness size={22} />
          </div>
          <div>
            <span>Current page</span>
            <strong>
              {totalPages ? page + 1 : 0} <small>/ {totalPages}</small>
            </strong>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-icon stat-green">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span>Signed-in role</span>
            <strong>{isAdmin ? "ADMIN" : "USER"}</strong>
          </div>
        </article>
      </section>

      {showEmployeeForm && isAdmin && (
        <section className="panel employee-form-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {editingId !== null ? "UPDATE RECORD" : "NEW RECORD"}
              </span>
              <h3>
                {editingId !== null ? "Edit Employee" : "Add New Employee"}
              </h3>
            </div>

            <IconButton
              label="Close form"
              onClick={() => setShowEmployeeForm(false)}
            >
              <X size={19} />
            </IconButton>
          </div>

          <form onSubmit={handleSaveEmployee}>
            <div className="form-grid">
              <label>
                First name
                <input
                  value={form.firstName}
                  onChange={(event) =>
                    setForm({ ...form, firstName: event.target.value })
                  }
                  placeholder="e.g. Rahul"
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Last name
                <input
                  value={form.lastName}
                  onChange={(event) =>
                    setForm({ ...form, lastName: event.target.value })
                  }
                  placeholder="e.g. Patil"
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Email address
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="name@example.com"
                  maxLength={255}
                  required
                />
              </label>

              <label>
                Department
                <input
                  value={form.department}
                  onChange={(event) =>
                    setForm({ ...form, department: event.target.value })
                  }
                  placeholder="e.g. Engineering"
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Annual salary (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salary}
                  onChange={(event) =>
                    setForm({ ...form, salary: event.target.value })
                  }
                  placeholder="e.g. 500000"
                  required
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowEmployeeForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                {editingId !== null ? (
                  <Pencil size={17} />
                ) : (
                  <PlusCircle size={17} />
                )}
                {editingId !== null ? "Save changes" : "Create employee"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel employee-panel">
        <div className="panel-heading employee-heading">
          <div>
            <h3>Employee directory</h3>
            <p className="muted">
              Search, review and manage employee records.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button refresh-button"
            onClick={handleRefresh}
          >
            <RefreshCw size={16} />
            Reset
          </button>
        </div>

        <form className="search-toolbar" onSubmit={handleSearch}>
          <label className="search-field">
            <Search size={18} />
            <input
              value={nameSearch}
              onChange={(event) => setNameSearch(event.target.value)}
              placeholder="Search by name"
              aria-label="Search by name"
            />
          </label>

          <label className="search-field">
            <BriefcaseBusiness size={18} />
            <input
              value={departmentSearch}
              onChange={(event) =>
                setDepartmentSearch(event.target.value)
              }
              placeholder="Filter by department"
              aria-label="Filter by department"
            />
          </label>

          <button type="submit" className="primary-button search-button">
            <Search size={17} />
            Search
          </button>
        </form>

        <div className="table-wrap">
          <table className="employee-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
                <th>Email</th>
                <th>Department</th>
                <th>Salary</th>
                <th>Details</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="table-message">
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="table-message">
                    <Users size={26} />
                    <strong>No employees found</strong>
                    <span>
                      Try changing your search or add a new employee.
                    </span>
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="id-cell">#{employee.id}</td>

                    <td>
                      <div className="employee-name">
                        <span className="employee-avatar">
                          {(employee.firstName?.[0] ?? "E").toUpperCase()}
                        </span>
                        <strong>
                          {employee.firstName} {employee.lastName}
                        </strong>
                      </div>
                    </td>

                    <td>{employee.email}</td>

                    <td>
                      <span className="department-chip">
                        {employee.department}
                      </span>
                    </td>

                    <td className="salary-cell">
                      {formatSalary(employee.salary)}
                    </td>

                    <td>
                      <IconButton
                        label={`View ${employee.firstName} ${employee.lastName}`}
                        onClick={() => setViewingEmployee(employee)}
                      >
                        <Eye size={18} />
                      </IconButton>
                    </td>

                    {isAdmin && (
                      <td>
                        <div className="action-buttons">
                          <IconButton
                            label={`Edit ${employee.firstName} ${employee.lastName}`}
                            className="edit-icon"
                            onClick={() => openEditForm(employee)}
                          >
                            <Pencil size={17} />
                          </IconButton>

                          <IconButton
                            label={`Delete ${employee.firstName} ${employee.lastName}`}
                            className="delete-icon"
                            onClick={() => handleDeleteEmployee(employee)}
                          >
                            <Trash2 size={17} />
                          </IconButton>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>
            Showing{" "}
            {employees.length ? page * PAGE_SIZE + 1 : 0}
            {"–"}
            {page * PAGE_SIZE + employees.length}
            {" of "}
            {totalElements}
          </span>

          <div className="pagination-controls">
            <button
              type="button"
              className="secondary-button"
              disabled={page <= 0 || loading}
              onClick={() =>
                setPage((previous) => Math.max(0, previous - 1))
              }
            >
              <ChevronLeft size={17} />
              Previous
            </button>

            <span className="page-indicator">
              Page {totalPages ? page + 1 : 0} of {totalPages}
            </span>

            <button
              type="button"
              className="secondary-button"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((previous) => previous + 1)}
            >
              Next
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {viewingEmployee && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setViewingEmployee(null)}
        >
          <section
            className="employee-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-heading">
              <div>
                <span className="eyebrow">EMPLOYEE PROFILE</span>
                <h3 id="employee-modal-title">Employee details</h3>
              </div>

              <IconButton
                label="Close details"
                onClick={() => setViewingEmployee(null)}
              >
                <X size={19} />
              </IconButton>
            </div>

            <div className="profile-heading">
              <span className="profile-avatar">
                {(viewingEmployee.firstName?.[0] ?? "E").toUpperCase()}
              </span>
              <div>
                <h2>
                  {viewingEmployee.firstName} {viewingEmployee.lastName}
                </h2>
                <p>{viewingEmployee.department}</p>
              </div>
            </div>

            <dl className="detail-list">
              <div>
                <dt>Employee ID</dt>
                <dd>#{viewingEmployee.id}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{viewingEmployee.email}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{viewingEmployee.department}</dd>
              </div>
              <div>
                <dt>Salary</dt>
                <dd>{formatSalary(viewingEmployee.salary)}</dd>
              </div>
            </dl>

            <button
              type="button"
              className="primary-button modal-close"
              onClick={() => setViewingEmployee(null)}
            >
              Close
            </button>
          </section>
        </div>
      )}

      <footer className="app-footer">
        WorkForce Pro · Employee Management System
      </footer>
    </main>
  );
}
