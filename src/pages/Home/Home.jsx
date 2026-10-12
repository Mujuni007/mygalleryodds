import React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../../components/Logo/Logo";
import { useAuth } from "../../context/AuthContext";
import { getCommunicationStatus, getFreeOdds, getPremiumOdds } from "../../services/userStore";
import "./Home.css";

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [freeUnreadCount, setFreeUnreadCount] = useState(0);
  const [premiumUnreadCount, setPremiumUnreadCount] = useState(0);
  const [unreadCommunicationAt, setUnreadCommunicationAt] = useState(null);

  const subscriptionActive = Boolean(
    user?.plan &&
      user.paymentVerified &&
      user.subscriptionExpiresAt &&
      new Date(user.subscriptionExpiresAt).getTime() > now
  );

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function refreshUnreadCounts() {
      const results = await Promise.allSettled([
        getFreeOdds(),
        subscriptionActive ? getPremiumOdds() : Promise.resolve({ posts: [] }),
        getCommunicationStatus(),
      ]);
      if (!isCurrent) return;

      const freePosts = results[0].status === "fulfilled" ? results[0].value?.posts || [] : [];
      const premiumPosts = results[1].status === "fulfilled" ? results[1].value?.posts || [] : [];
      setFreeUnreadCount(freePosts.filter((post) => !post.isRead).length);
      setPremiumUnreadCount(premiumPosts.filter((post) => !post.isRead).length);
      const communicationStatus = results[2].status === "fulfilled" ? results[2].value : null;
      setUnreadCommunicationAt(
        communicationStatus?.isUnread ? communicationStatus.communication?.updatedAt || null : null
      );
    }

    refreshUnreadCounts();
    window.addEventListener("storage", refreshUnreadCounts);
    window.addEventListener("focus", refreshUnreadCounts);

    return () => {
      isCurrent = false;
      window.removeEventListener("storage", refreshUnreadCounts);
      window.removeEventListener("focus", refreshUnreadCounts);
    };
  }, [subscriptionActive, user?.id]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!user) return null;

  const verificationPending = Boolean(user.paymentProof && !user.paymentVerified);
  const timeLeft = subscriptionActive ? getTimeLeft(user.subscriptionExpiresAt, now) : null;

  return (
    <div className="home-page">
      <header className="home-header">
        <Logo />
        <div className="home-header-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/communication")}>
            Communication from Admin
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="home-main">
        <section className="home-welcome">
          <span className="badge badge-success">Signed in</span>
          <h1>Welcome to GalleryODDS, {(user.username || user.fullName).split(" ")[0]}</h1>
          <p>Choose where you&apos;d like to start.</p>
        </section>

        {unreadCommunicationAt && (
          <Link to="/communication" className="home-communication-alert" role="status">
            <span className="home-communication-copy">
              <span>You have an unopened message from the admin.</span>
              <time dateTime={unreadCommunicationAt}>
                Published {formatDateTime(unreadCommunicationAt)}
              </time>
            </span>
            <strong>Read message <span aria-hidden="true">→</span></strong>
          </Link>
        )}

        <section className="home-destinations" aria-label="Odds pages">
          <Link to="/odds/free" className="home-destination-card home-destination-free">
            <span className="badge badge-success">Free daily odds</span>
            <h2>View free daily odds</h2>
            <p>Open today&apos;s selection, available to every signed-in user.</p>
            {freeUnreadCount > 0 && (
              <span className="home-unread-warning" role="status" aria-live="polite">
                You have {freeUnreadCount} unopened free odds message{freeUnreadCount === 1 ? "" : "s"}.
              </span>
            )}
            <span className="home-destination-action">
              View free daily odds <span aria-hidden="true">→</span>
            </span>
          </Link>

          {subscriptionActive ? (
            <Link to="/odds/premium" className="home-destination-card home-destination-premium">
              <span className="badge badge-amber">Verified member</span>
              <h2>View premium odds</h2>
              <p>{capitalize(user.plan)} plan · {timeLeft.label} remaining</p>
              {premiumUnreadCount > 0 && (
                <span className="home-unread-warning" role="status" aria-live="polite">
                  You have {premiumUnreadCount} unopened premium odds message{premiumUnreadCount === 1 ? "" : "s"}.
                </span>
              )}
              <span className="home-destination-action">
                View premium odds <span aria-hidden="true">→</span>
              </span>
            </Link>
          ) : (
            <Link to="/subscription" className="home-destination-card home-destination-premium">
              <span className={`badge ${verificationPending ? "badge-neutral" : "badge-amber"}`}>
                {verificationPending ? "Verification pending" : "Subscription"}
              </span>
              <h2>Get access to premium odds</h2>
              <p>
                {verificationPending
                  ? "Your payment is awaiting admin verification."
                  : "Choose a plan and get verified to unlock premium daily odds."}
              </p>
              <span className="home-destination-action">
                View subscription plan <span aria-hidden="true">→</span>
              </span>
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}

function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getTimeLeft(expiration, now) {
  const millisecondsLeft = Math.max(0, new Date(expiration).getTime() - now);
  const days = Math.floor(millisecondsLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((millisecondsLeft / (1000 * 60 * 60)) % 24);
  return { days, label: `${days}d ${hours}h` };
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}