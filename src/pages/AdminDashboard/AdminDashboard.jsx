import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo/Logo";
import { useAuth } from "../../context/AuthContext";
import { getAdminUsers, setPaymentVerification } from "../../services/authService";
import {
  getCommunication,
  getAdminContent,
  getFreeOdds,
  getPremiumOdds,
  saveContentDraft,
  saveCommunication,
  saveFreeOdds,
  savePremiumOdds,
} from "../../services/userStore";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const { admin, adminLogout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [nextUserCursor, setNextUserCursor] = useState(null);
  const [usersError, setUsersError] = useState("");
  const [selectedPaymentProof, setSelectedPaymentProof] = useState(null);
  const [query, setQuery] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [communicationTitle, setCommunicationTitle] = useState("");
  const [communicationMessage, setCommunicationMessage] = useState("");
  const [communicationNotice, setCommunicationNotice] = useState("");
  const [freeOddsTitle, setFreeOddsTitle] = useState("");
  const [freeOddsContent, setFreeOddsContent] = useState("");
  const [premiumOddsTitle, setPremiumOddsTitle] = useState("");
  const [premiumOddsContent, setPremiumOddsContent] = useState("");
  const [oddsNotice, setOddsNotice] = useState("");
  const [publishingOdds, setPublishingOdds] = useState("");
  const [now, setNow] = useState(Date.now());
  const [contentLoaded, setContentLoaded] = useState(false);

  async function refresh(force = false) {
    try {
      const result = await getAdminUsers("", { force });
      setUsers(result.users);
      setNextUserCursor(result.nextCursor);
      setUsersError("");
    } catch (error) {
      setUsers([]);
      setUsersError(error.message || "Unable to load users.");
    }
  }

  async function loadMoreUsers() {
    if (!nextUserCursor) return;
    try {
      const result = await getAdminUsers("", { cursor: nextUserCursor });
      setUsers((current) => [...current, ...result.users]);
      setNextUserCursor(result.nextCursor);
    } catch (error) {
      setUsersError(error.message || "Unable to load more users.");
    }
  }

  async function publishCommunication(event) {
    event.preventDefault();
    if (!communicationTitle.trim() || !communicationMessage.trim()) {
      setCommunicationNotice("Add a title and message before publishing.");
      return;
    }
    try {
      await saveCommunication({ title: communicationTitle, message: communicationMessage });
      setCommunicationTitle("");
      setCommunicationMessage("");
      setCommunicationNotice("Communication published.");
    } catch (err) {
      setCommunicationNotice(err.message || "Unable to publish communication.");
    }
  }

  async function publishOdds(event, premium) {
    event.preventDefault();
    if (publishingOdds) return;
    const title = premium ? premiumOddsTitle : freeOddsTitle;
    const content = premium ? premiumOddsContent : freeOddsContent;
    if (!title.trim() || !content.trim()) {
      setOddsNotice("Add a title and odds before publishing.");
      return;
    }
    const save = premium ? savePremiumOdds : saveFreeOdds;
    setPublishingOdds(premium ? "premium" : "free");
    setOddsNotice("");
    try {
      await save({ title, content });
      if (premium) {
        setPremiumOddsTitle("");
        setPremiumOddsContent("");
      } else {
        setFreeOddsTitle("");
        setFreeOddsContent("");
      }
      setOddsNotice(premium ? "Premium odds published." : "Free odds published.");
    } catch (err) {
      setOddsNotice(err.message || "Unable to publish odds.");
    } finally {
      setPublishingOdds("");
    }
  }

  async function verifyPayment(userId, verified) {
    await setPaymentVerification(userId, verified);
    await refresh(true);
  }

  useEffect(() => {
    if (!selectedPaymentProof) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setSelectedPaymentProof(null);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPaymentProof]);

  useEffect(() => {
    refresh();
    getAdminContent().then((content) => {
      const communication = content.communication;
      const freeOdds = content.free_odds;
      const premiumOdds = content.premium_odds;
      if (communication) {
        const value = communication.draft || communication;
        setCommunicationTitle(value.title || "");
        setCommunicationMessage(value.message || "");
      }
      if (freeOdds) {
        const value = freeOdds.draft || freeOdds;
        setFreeOddsTitle(value.title || "");
        setFreeOddsContent(value.content || "");
      }
      if (premiumOdds) {
        const value = premiumOdds.draft || premiumOdds;
        setPremiumOddsTitle(value.title || "");
        setPremiumOddsContent(value.content || "");
      }
      setContentLoaded(true);
    }).catch(() => {
      setCommunicationNotice("Unable to load saved content.");
      setContentLoaded(true);
    });
    // Picks up changes made in other tabs (e.g. a user subscribing) so the
    // table "updates automatically" without a manual reload.
    const handleStorage = () => refresh();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
      clearInterval(clock);
    };
  }, []);

  useEffect(() => {
    if (!contentLoaded) return undefined;
    const timeout = setTimeout(() => {
      const drafts = [
        communicationTitle || communicationMessage
          ? saveContentDraft("communication", {
              title: communicationTitle,
              message: communicationMessage,
            })
          : null,
        freeOddsTitle || freeOddsContent
          ? saveContentDraft("free_odds", {
              title: freeOddsTitle,
              content: freeOddsContent,
            })
          : null,
        premiumOddsTitle || premiumOddsContent
          ? saveContentDraft("premium_odds", {
              title: premiumOddsTitle,
              content: premiumOddsContent,
            })
          : null,
      ].filter(Boolean);

      Promise.all(drafts).catch(() => {
        setCommunicationNotice("Draft could not be saved. Check your connection.");
      });
    }, 600);

    return () => clearTimeout(timeout);
  }, [
    communicationTitle,
    communicationMessage,
    freeOddsTitle,
    freeOddsContent,
    premiumOddsTitle,
    premiumOddsContent,
    contentLoaded,
  ]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const verifiedUsers = users.filter((u) =>
      u.status === "active" &&
      u.paymentVerified &&
      u.subscriptionExpiresAt &&
      new Date(u.subscriptionExpiresAt).getTime() > now
    );
    const weekly = verifiedUsers.filter((u) => u.plan === "weekly").length;
    const monthly = verifiedUsers.filter((u) => u.plan === "monthly").length;
    return { total, active, verified: verifiedUsers.length, weekly, monthly };
  }, [users, now]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchingUsers = q ? users.filter(
      (u) =>
        (u.username || u.fullName).toLowerCase().includes(q) ||
        (u.phone || u.email || "").toLowerCase().includes(q)
    ) : users;
    return [...matchingUsers].sort(
      (first, second) =>
        Number(Boolean(second.paymentProof && !second.paymentVerified)) -
        Number(Boolean(first.paymentProof && !first.paymentVerified))
    );
  }, [users, query]);

  const usersPerPage = 8;
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const visibleUsers = useMemo(() => {
    const start = (userPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, userPage]);

  useEffect(() => {
    setUserPage(1);
  }, [query]);

  useEffect(() => {
    if (userPage > totalUserPages) setUserPage(totalUserPages);
  }, [totalUserPages, userPage]);

  const usersAwaitingVerification = users.filter(
    (user) => user.paymentProof && !user.paymentVerified
  ).length;

  function handleLogout() {
    adminLogout();
    navigate("/admin/login");
  }

  if (!admin) return null;

  return (
    <div className="dash-page">
      <header className="dash-header">
        <Logo />
        <div className="dash-header-right">
          <span className="dash-admin-email">Logged in as admin</span>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="dash-main">
        <h1>Admin dashboard</h1>
        <p className="dash-sub">A live view of every GalleryODDS account and its plan.</p>

        <div className="stat-grid">
          <StatCard label="Total users" value={stats.total} />
          <StatCard label="Active accounts" value={stats.active} tone="success" />
          <StatCard label="Verified active users" value={stats.verified} tone="success" />
          <StatCard label="Verified weekly users" value={stats.weekly} tone="neutral" />
          <StatCard label="Verified monthly users" value={stats.monthly} tone="neutral" />
        </div>

        <section className="communication-admin-grid">
          <form className="admin-panel communication-editor" onSubmit={publishCommunication}>
            <div className="admin-panel-heading">
              <div>
                <span className="badge badge-neutral">Communication</span>
                <h2>Write a message</h2>
              </div>
              <span className="admin-panel-caption">Current message</span>
            </div>
            <label className="admin-field">
              <span>Title</span>
              <input
                value={communicationTitle}
                onChange={(event) => setCommunicationTitle(event.target.value)}
                placeholder="Message title"
              />
            </label>
            <label className="admin-field">
              <span>Message</span>
              <textarea
                value={communicationMessage}
                onChange={(event) => setCommunicationMessage(event.target.value)}
                placeholder="Write the update for selected users"
                rows="6"
              />
            </label>
            <button type="submit" className="btn btn-primary">Publish message</button>
          </form>

          <div className="admin-panel communication-audience">
            <span className="badge badge-success">All accounts</span>
            <h2>Everyone can receive this message</h2>
            <p>Published communication is available to every signed-in GalleyODD user.</p>
            {communicationNotice && <p className="admin-panel-notice">{communicationNotice}</p>}
          </div>
        </section>

        <section className="odds-admin-grid">
          <form className="admin-panel" onSubmit={(event) => publishOdds(event, false)}>
            <div className="admin-panel-heading">
              <div>
                <span className="badge badge-success">Free odds</span>
                <h2>Post free odds of the day</h2>
              </div>
            </div>
            <label className="admin-field">
              <span>Title</span>
              <input value={freeOddsTitle} onChange={(event) => setFreeOddsTitle(event.target.value)} placeholder="Free odds title" />
            </label>
            <label className="admin-field">
              <span>Odds</span>
              <textarea value={freeOddsContent} onChange={(event) => setFreeOddsContent(event.target.value)} placeholder="Add today's free odds" rows="5" />
            </label>
            <button type="submit" className="btn btn-primary" disabled={Boolean(publishingOdds)}>
              {publishingOdds === "free" ? "Publishing free odds…" : "Publish free odds"}
            </button>
          </form>

          <form className="admin-panel" onSubmit={(event) => publishOdds(event, true)}>
            <div className="admin-panel-heading">
              <div>
                <span className="badge badge-amber">Premium odds</span>
                <h2>Post verified-member odds</h2>
              </div>
            </div>
            <label className="admin-field">
              <span>Title</span>
              <input value={premiumOddsTitle} onChange={(event) => setPremiumOddsTitle(event.target.value)} placeholder="Premium odds title" />
            </label>
            <label className="admin-field">
              <span>Odds</span>
              <textarea value={premiumOddsContent} onChange={(event) => setPremiumOddsContent(event.target.value)} placeholder="Add today's premium odds" rows="5" />
            </label>
            <button type="submit" className="btn btn-primary" disabled={Boolean(publishingOdds)}>
              {publishingOdds === "premium" ? "Publishing premium odds…" : "Publish premium odds"}
            </button>
          </form>
          {oddsNotice && <p className="admin-panel-notice odds-notice">{oddsNotice}</p>}
        </section>

        <div className="table-card">
          <div className="table-toolbar">
            <div>
              <h2>All users</h2>
              <span className="table-count">{users.length} user{users.length === 1 ? "" : "s"}</span>
              {usersAwaitingVerification > 0 && (
                <span className="table-count table-awaiting-count">
                  {usersAwaitingVerification} awaiting verification · listed first
                </span>
              )}
            </div>
            <input
              type="search"
              placeholder="Search by username or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="table-search"
            />
          </div>

          {usersError && (
            <div className="table-error">
              <strong>Users could not be loaded.</strong>
              <span>{usersError}</span>
              <span>Confirm that this admin account has an admins/{admin.id} document with role: admin, then publish the latest Firestore rules.</span>
            </div>
          )}

          {!usersError && filteredUsers.length === 0 ? (
            <div className="table-empty">
              {users.length === 0
                ? "No one has registered yet. New accounts will appear here automatically."
                : "No users match that search."}
            </div>
          ) : (
            <>
            {!usersError && filteredUsers.length > 0 && (
              <div className="table-pagination">
                <span>
                  Showing {(userPage - 1) * usersPerPage + 1}–
                  {Math.min(userPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length}
                </span>
                <div className="table-pagination-controls">
                  <button
                    type="button"
                    className="table-page-button"
                    aria-label="Previous users page"
                    onClick={() => setUserPage((page) => Math.max(1, page - 1))}
                    disabled={userPage === 1}
                  >
                    ←
                  </button>
                  <span>Page {userPage} of {totalUserPages}</span>
                  <button
                    type="button"
                    className="table-page-button"
                    aria-label="Next users page"
                    onClick={() => setUserPage((page) => Math.min(totalUserPages, page + 1))}
                    disabled={userPage === totalUserPages}
                  >
                    →
                  </button>
                </div>
              </div>
            )}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Full name</th>
                    <th>Phone number</th>
                    <th>Plan</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Subscription</th>
                    <th>Joined</th>
                    <th>Payment proof</th>
                    <th>Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((u) => (
                    <tr
                      key={u.id}
                      className={u.paymentProof && !u.paymentVerified ? "user-awaiting-verification" : ""}
                    >
                      <td className="mono">{u.id}</td>
                      <td>{u.username || u.fullName}</td>
                      <td>{u.phone || u.email || "—"}</td>
                      <td>
                        {u.plan ? (
                          <span className="badge badge-neutral">{capitalize(u.plan)}</span>
                        ) : (
                          <span className="badge badge-amber">No plan</span>
                        )}
                      </td>
                      <td>
                        {u.planPrice ? `$${u.planPrice}` : "—"}
                      </td>
                      <td>
                        <span className={`badge ${u.status === "active" ? "badge-success" : "badge-amber"}`}>
                          {capitalize(u.status)}
                        </span>
                      </td>
                      <td>
                        <SubscriptionStatus user={u} now={now} />
                      </td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td>
                        {u.paymentProof ? (
                          <button
                            type="button"
                            className="payment-proof-link"
                            onClick={() => setSelectedPaymentProof({
                              ...u.paymentProof,
                              userName: u.username || u.fullName,
                            })}
                          >
                            <img
                              className="payment-proof-thumb"
                              src={u.paymentProof.imageData}
                              alt={`Payment proof from ${u.username || u.fullName}`}
                            />
                            <span>View screenshot</span>
                          </button>
                        ) : (
                          <span className="payment-proof-missing">Not uploaded</span>
                        )}
                      </td>
                      <td>
                        {u.paymentProof ? (
                          <button
                            type="button"
                            className={`verification-button ${u.paymentVerified ? "verification-approved" : ""}`}
                            onClick={() => verifyPayment(u.id, !u.paymentVerified)}
                          >
                            {u.paymentVerified ? "Verified · revoke" : "Verify payment"}
                          </button>
                        ) : (
                          <span className="payment-proof-missing">Awaiting proof</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {nextUserCursor && (
              <div className="table-pagination">
                <button type="button" className="btn btn-ghost" onClick={loadMoreUsers}>
                  Load more users
                </button>
              </div>
            )}
            </>
          )}
        </div>
      </main>
      {selectedPaymentProof && (
        <PaymentProofDialog
          paymentProof={selectedPaymentProof}
          onClose={() => setSelectedPaymentProof(null)}
        />
      )}
    </div>
  );
}

function PaymentProofDialog({ paymentProof, onClose }) {
  const [downloadError, setDownloadError] = useState("");

  function downloadProof() {
    try {
      const [metadata, encodedData] = paymentProof.imageData.split(",");
      const mimeType = metadata.match(/^data:(.*?);base64$/)?.[1] || "image/jpeg";
      const decodedData = atob(encodedData);
      const bytes = new Uint8Array(decodedData.length);
      for (let index = 0; index < decodedData.length; index += 1) {
        bytes[index] = decodedData.charCodeAt(index);
      }

      const fileUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = paymentProof.fileName || "payment-proof.jpg";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
      setDownloadError("");
    } catch {
      setDownloadError("Unable to download this screenshot. You can still view it above.");
    }
  }

  return (
    <div
      className="payment-proof-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="payment-proof-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-proof-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="payment-proof-dialog-header">
          <div>
            <h2 id="payment-proof-title">Payment proof</h2>
            <p>{paymentProof.userName}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="payment-proof-image-wrap">
          <img
            className="payment-proof-full-image"
            src={paymentProof.imageData}
            alt={`Payment proof submitted by ${paymentProof.userName}`}
          />
        </div>
        <footer className="payment-proof-dialog-actions">
          <button type="button" className="btn btn-primary" onClick={downloadProof}>
            Download screenshot
          </button>
        </footer>
        {downloadError && <p className="payment-proof-download-error" role="alert">{downloadError}</p>}
      </section>
    </div>
  );
}

function StatCard({ label, value, tone = "default" }) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function SubscriptionStatus({ user, now }) {
  if (!user.plan || !user.subscriptionExpiresAt) {
    return <span className="subscription-status subscription-status-muted">No active plan</span>;
  }

  const millisecondsLeft = new Date(user.subscriptionExpiresAt).getTime() - now;
  if (!user.paymentVerified || millisecondsLeft <= 0) {
    return (
      <span className="subscription-status subscription-status-expired">
        {millisecondsLeft <= 0 ? "Expired" : "Awaiting verification"}
      </span>
    );
  }

  const days = Math.floor(millisecondsLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((millisecondsLeft / (1000 * 60 * 60)) % 24);
  return (
    <span className="subscription-status subscription-status-active">
      <strong>{days}d {hours}h left</strong>
      <small>Ends {formatDate(user.subscriptionExpiresAt)}</small>
    </span>
  );
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
