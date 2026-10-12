import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import Notification from "../../components/Notification/Notification";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_EMAIL, authErrorMessage } from "../../services/authService";
import "./AdminLogin.css";

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate() {
    const next = {};
    if (!form.password) next.password = "Enter the admin password.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await adminLogin({ email: ADMIN_EMAIL, password: form.password });
      navigate("/admin/dashboard");
    } catch (err) {
      setServerError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Admin console"
      title="Everything you need to run GalleryODDS."
      copy="Statistics, subscriber records, and account status — all in one dashboard."
    >
      <div className="login-head">
        <h2>Admin sign in</h2>
        <p className="login-sub">This area is restricted to GalleryODDS administrator.</p>
      </div>

      {serverError && (
        <Notification type="error" message={serverError} onDismiss={() => setServerError("")} />
      )}

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <PasswordInput
            id="admin-password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
          />
          <span className="field-error">{errors.password}</span>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in to dashboard"}
        </button>
      </form>

      <Link to="/login" className="login-admin-link">
        ← Back to user sign in
      </Link>
    </AuthLayout>
  );
}
