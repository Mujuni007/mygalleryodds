import React from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import Notification from "../../components/Notification/Notification";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { authErrorMessage } from "../../services/authService";
import { isValidEmail } from "../../services/validators";
import "./Login.css";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [confirmation, setConfirmation] = useState(state?.confirmation || "");
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  }

  function validate() {
    const next = {};
    if (!isValidEmail(form.email)) next.email = "Enter a valid email address.";
    if (!form.password) next.password = "Enter your password.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleEmailSignIn(event) {
    event.preventDefault();
    setServerError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await login({ email: form.email, password: form.password });
      navigate("/home", { replace: true });
    } catch (error) {
      setServerError(authErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setServerError("");
    setSubmitting(true);
    try {
      await loginWithGoogle();
      navigate("/home", { replace: true });
    } catch (error) {
      setServerError(authErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Sign in"
      title="Pick up right where you left off."
      copy="Use Google or a verified email address to manage your GalleryODDS subscription."
    >
      <div className="login-head">
        <h2>Welcome back</h2>
        <p className="login-sub">Sign in to manage your GalleryODDS subscription.</p>
      </div>

      {confirmation && (
        <Notification type="success" message={confirmation} onDismiss={() => setConfirmation("")} />
      )}

      {serverError && (
        <Notification type="error" message={serverError} onDismiss={() => setServerError("")} />
      )}

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={handleGoogleSignIn}
        disabled={submitting}
      >
        {submitting ? "Signing in..." : "Continue with Google"}
      </button>

      <div className="login-divider">or sign in with email</div>

      <form className="login-form" onSubmit={handleEmailSignIn} noValidate>
        <div className="field">
          <label htmlFor="email">
            Email address <small>(enter a valid email)</small>
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
          <span className="field-error">{errors.email}</span>
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
          />
          <span className="field-error">{errors.password}</span>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          Sign in with email
        </button>
      </form>

      <a
        className="btn login-whatsapp-help"
        href="https://wa.me/256776491230"
        target="_blank"
        rel="noreferrer"
      >
        Customer care help on WhatsApp
      </a>

      <p className="login-switch">
        New to GalleryODDS? <Link to="/signup">Create an account</Link>
      </p>

      <hr className="rule login-rule" />

      <Link to="/admin/login" className="login-admin-link">
        Sign in as admin instead →
      </Link>
    </AuthLayout>
  );
}
