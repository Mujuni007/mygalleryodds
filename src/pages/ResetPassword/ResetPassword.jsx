import React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import Notification from "../../components/Notification/Notification";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import { auth } from "../../firebase";
import "./ResetPassword.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeReady, setCodeReady] = useState(false);
  const [email, setEmail] = useState("");
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  useEffect(() => {
    async function validateCode() {
      if (!mode || !oobCode) {
        setError("This password reset link is invalid or expired. Please request a new one.");
        return;
      }

      if (mode !== "resetPassword") {
        setError("This page mode is invalid. Please request a new password reset link.");
        return;
      }

      try {
        const resolvedEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(resolvedEmail || "your email");
        setCodeReady(true);
      } catch {
        setError("This password reset link is invalid or has expired. Please request a new one.");
      }
    }

    validateCode();
  }, [mode, oobCode]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!codeReady) {
      setError("This reset link is invalid. Please request a new password reset link.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("Use a password with at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess("Your password was updated successfully. Redirecting to sign in...");
      setTimeout(() => navigate("/login", { state: { confirmation: "Your password has been updated. Please sign in." } }), 1800);
    } catch (err) {
      setError(err?.message || "Unable to reset your password. Please request a new link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Set a new password"
      copy="Choose a new password for your GalleyODD account."
    >
      {error && <Notification type="error" message={error} onDismiss={() => setError("")} />}
      {success && <Notification type="success" message={success} onDismiss={() => setSuccess("")} />}

      {!codeReady && !error ? (
        <p className="reset-status">Validating your reset link...</p>
      ) : null}

      {codeReady && (
        <form className="reset-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} readOnly />
          </div>

          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter a new password"
            />
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Updating password..." : "Reset password"}
          </button>
        </form>
      )}

      <p className="login-switch">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
