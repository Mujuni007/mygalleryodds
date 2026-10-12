import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import Notification from "../../components/Notification/Notification";
import { useAuth } from "../../context/AuthContext";
import "../Login/Login.css";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function UsernameSetup() {
  const { user, setUsername } = useAuth();
  const navigate = useNavigate();
  const [username, setUsernameValue] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = username.trim();
    if (!USERNAME_RE.test(trimmed)) {
      setError("Use 3 to 20 letters, numbers, or underscores.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await setUsername(trimmed);
      navigate("/home", { replace: true });
    } catch (err) {
      if (err.code === "permission-denied") {
        setError("Username setup is not enabled yet. Deploy the latest Firestore rules, then try again.");
      } else {
        setError(err.message || "That username could not be saved.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Choose a username"
      title="Make your GalleryODDS profile yours."
      copy="Your username is unique and will identify you across your account."
    >
      <div className="login-head">
        <h2>Choose your username</h2>
        <p className="login-sub">You are signed in as {user?.email}.</p>
      </div>

      {error && <Notification type="error" message={error} onDismiss={() => setError("")} />}

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsernameValue(event.target.value)}
            maxLength={20}
            autoFocus
          />
          <span className="field-hint">3 to 20 letters, numbers, or underscores.</span>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Saving username..." : "Continue"}
        </button>
      </form>
    </AuthLayout>
  );
}
