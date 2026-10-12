import React from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo/Logo";
import { useAuth } from "../../context/AuthContext";
import { getCommunications, markCommunicationRead } from "../../services/userStore";
import "./Communication.css";

export default function Communication() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [communications, setCommunications] = useState([]);
  const lastMarkedReadAt = useRef(null);

  useEffect(() => {
    let isCurrent = true;

    async function refresh() {
      try {
        const nextCommunications = await getCommunications();
        if (!isCurrent) return;
        setCommunications(nextCommunications);
        const newestCommunication = nextCommunications[0];
        if (newestCommunication && lastMarkedReadAt.current !== newestCommunication.updatedAt) {
          try {
            await markCommunicationRead(newestCommunication.updatedAt);
            lastMarkedReadAt.current = newestCommunication.updatedAt;
          } catch {
            return;
          }
        }
      } catch {
        if (isCurrent) setCommunications([]);
      }
    }

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      isCurrent = false;
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <div className="communication-page">
      <header className="communication-header">
        <Logo />
        <div className="communication-header-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/subscription")}>
            Back to plans
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="communication-main">
        <span className="badge badge-neutral">Admin communication</span>
        <h1>Messages from GalleryODDS</h1>
        <p className="communication-sub">Updates and important information shared with your account.</p>

        {communications.length ? (
          <div className="communication-messages">
            {communications.map((communication) => (
              <article className="communication-message" key={communication.id}>
                <div className="communication-message-topline">
                  <span className="badge badge-success">Available to all accounts</span>
                  <time dateTime={communication.publishedAt}>
                    Published {formatDateTime(communication.publishedAt)}
                  </time>
                </div>
                <h2>{communication.title}</h2>
                <p>{communication.message}</p>
              </article>
            ))}
          </div>
        ) : (
          <section className="communication-empty">
            <span className="communication-empty-mark">—</span>
            <h2>No messages yet</h2>
            <p>New communication from the admin will appear here for every signed-in account.</p>
          </section>
        )}
      </main>
    </div>
  );
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}