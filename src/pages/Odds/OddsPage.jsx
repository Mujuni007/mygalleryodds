import React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo/Logo";
import { useAuth } from "../../context/AuthContext";
import { getFreeOdds, getPremiumOdds, markOddsRead } from "../../services/userStore";
import { copyTextToClipboard } from "../../services/clipboard";
import "./Odds.css";

export default function OddsPage({ premium }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [odds, setOdds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentUser, setCurrentUser] = useState(user);
  const [copiedPostId, setCopiedPostId] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [copyFailed, setCopyFailed] = useState(false);

  async function markVisibleOddsRead(posts = odds) {
    const key = premium ? "premium_odds" : "free_odds";
    const unreadPosts = posts.filter((item) => !item.isRead);

    if (!unreadPosts.length) return;

    setOdds((current) => current.map((item) => unreadPosts.some((post) => post.id === item.id) ? { ...item, isRead: true } : item));

    try {
      await Promise.all(unreadPosts.map((post) => markOddsRead(key, post.id, true)));
    } catch {
      setOdds((current) => current.map((item) => unreadPosts.some((post) => post.id === item.id) ? { ...item, isRead: false } : item));
    }
  }

  useEffect(() => {
    async function refresh() {
      setLoadError("");
      try {
        const response = await (premium ? getPremiumOdds() : getFreeOdds());
        const posts = response?.posts || [];
        setOdds(posts);
        void markVisibleOddsRead(posts);
      } catch (error) {
        setOdds([]);
        if (error.code === "failed-precondition") {
          setLoadError("The odds feed needs a Firestore index to finish building. Please try again shortly.");
        } else if (error.code === "permission-denied") {
          setLoadError("You don’t have permission to view these odds. Confirm your account access and the published Firestore rules.");
        } else {
          setLoadError(error.message || "Unable to load odds. Please try again.");
        }
      } finally {
        setLoading(false);
      }
      setCurrentUser(user);
    }

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [premium, user]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  async function markPostRead(post) {
    if (post.isRead) return;

    const key = premium ? "premium_odds" : "free_odds";
    setOdds((current) => current.map((item) => item.id === post.id ? { ...item, isRead: true } : item));

    try {
      await markOddsRead(key, post.id, true);
    } catch {
      setOdds((current) => current.map((item) => item.id === post.id ? { ...item, isRead: false } : item));
    }
  }

  async function handleCopy(post) {
    try {
      await copyTextToClipboard(post.content);
      setCopiedPostId(post.id);
      setCopyFailed(false);
      setCopyFeedback("Odds copied to clipboard.");
      window.setTimeout(() => {
        setCopiedPostId((current) => current === post.id ? null : current);
      }, 1500);
    } catch {
      setCopiedPostId(null);
      setCopyFailed(true);
      setCopyFeedback("Could not copy odds. Please select and copy the text manually.");
    }
  }

  if (!user) return null;

  const premiumAllowed = Boolean(
    currentUser.plan &&
      currentUser.paymentVerified &&
      currentUser.subscriptionExpiresAt &&
      new Date(currentUser.subscriptionExpiresAt) > new Date()
  );

  return (
    <div className="odds-page">
      <header className="odds-header">
        <Logo />
        <div className="odds-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/subscription")}>
            Back to plans
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <main className="odds-main">
        <span className={`badge ${premium ? "badge-amber" : "badge-success"}`}>
          {premium ? "Verified members" : "Free daily odds"}
        </span>
        <h1>{premium ? "Premium odds of the day" : "Free odds of the day"}</h1>
        <p className="odds-subtitle">
          {premium ? "Exclusive selections for paid and verified members." : "A daily selection available to every signed-in user."}
        </p>

        {premium && !premiumAllowed ? (
          <section className="odds-empty">
            <span className="odds-lock">✓</span>
            <h2>Premium access is locked</h2>
            <p>Choose a plan, submit your payment proof, and wait for admin verification to view these odds.</p>
          </section>
        ) : loading ? (
          <section className="odds-empty" role="status">
            <p>Loading chat, please wait</p>
          </section>
        ) : loadError ? (
          <section className="odds-empty odds-load-error" role="alert">
            <h2>Odds could not be loaded</h2>
            <p>{loadError}</p>
          </section>
        ) : odds.length ? (
          <>
            <div className="odds-thread">
              {odds.map((post) => (
                <article className={`odds-card ${post.isRead ? "is-read" : "is-unread"}`} key={post.id}>
                  <div className="odds-card-topline">
                    <span className={`badge ${premium ? "badge-amber" : "badge-success"}`}>
                      {post.isRead ? "Read" : "New odds"}
                    </span>
                    <time className="odds-date" dateTime={post.publishedAt}>
                      Published: {formatDateTime(post.publishedAt)}
                    </time>
                  </div>
                  <div className="odds-title" aria-label={post.title}>{post.title}</div>
                  <div className="odds-body-row">
                    <p className="odds-content" aria-label={post.content}>{post.content}</p>
                    <button
                      type="button"
                      className={`odds-copy-btn ${copiedPostId === post.id ? "is-copied" : ""}`}
                      onClick={() => handleCopy(post)}
                      aria-label={copiedPostId === post.id ? "Odds copied" : `Copy odds for ${post.title}`}
                      title={copiedPostId === post.id ? "Copied" : "Copy odds"}
                    >
                      {copiedPostId === post.id ? "Copied" : "📋"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <p
              className={`odds-copy-feedback ${copyFailed ? "odds-copy-feedback-error" : ""}`}
              role="status"
              aria-live="polite"
            >
              {copyFeedback}
            </p>
          </>
        ) : (
          <section className="odds-empty">
            <h2>No odds posted yet</h2>
            <p>Check back later for today&apos;s selection.</p>
          </section>
        )}
      </main>
    </div>
  );
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}