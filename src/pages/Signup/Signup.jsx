import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import Notification from "../../components/Notification/Notification";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { authErrorMessage } from "../../services/authService";
import { isSecurePassword, isValidEmail, passwordIssues } from "../../services/validators";
import "./Signup.css";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate() {
    const next = {};
    if (!isValidEmail(form.email)) next.email = "Enter a valid email address.";

    if (!form.password) next.password = "Create a password.";
    else if (!isSecurePassword(form.password)) {
      next.password = `Use ${passwordIssues(form.password).join(", ")}.`;
    }

    if (!form.confirmPassword) next.confirmPassword = "Confirm your password.";
    else if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords don't match.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({
        email: form.email,
        password: form.password,
      });
      navigate("/login", {
        replace: true,
        state: {
          confirmation: "Account created. Check your inbox for the verification link. If you do not see it, check Spam, Junk, or Promotions, then mark the email as safe and try again.",
        },
      });
    } catch (err) {
      setServerError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Create account"
      title="Set up your GalleryODDS account in under a minute."
      copy="You'll choose a plan right after — nothing charges until you pick one."
    >
      <div className="login-head">
        <h2>Create your account</h2>
        <p className="login-sub">Get started with GalleryODDS.</p>
      </div>

      {serverError && (
        <Notification type="error" message={serverError} onDismiss={() => setServerError("")} />
      )}

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
          <span className="field-error">{errors.email}</span>
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
          />
          <span className={errors.password ? "field-error" : "field-hint"}>
            {errors.password || "Use at least 8 characters, including uppercase, lowercase, and a number."}
          </span>
        </div>

        <div className="field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={(e) => updateField("confirmPassword", e.target.value)}
          />
          <span className="field-error">{errors.confirmPassword}</span>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="login-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
