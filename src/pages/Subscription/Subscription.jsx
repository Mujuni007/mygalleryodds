import React from "react";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Logo from "../../components/Logo/Logo";
import Notification from "../../components/Notification/Notification";
import { useAuth } from "../../context/AuthContext";
import "./Subscription.css";

const PLANS = [
  {
    id: "weekly",
    name: "Weekly",
    price: "UGX35000",
    alternatePrice: "$10",
    cadence: "per week",
    features: ["Full GalleyODD access", "Weekly billing", "Cancel anytime"],
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "UGX100000",
    alternatePrice: "$30",
    cadence: "per month",
    features: ["Full GalleyODD access", "Monthly billing", "Cancel anytime"],
    highlight: true,
  },
];

export default function Subscription() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [confirmation, setConfirmation] = useState(state?.confirmation || "");
  const [submittingPlan, setSubmittingPlan] = useState(null);
  const currentUser = user;
  const subscriptionActive = Boolean(
    currentUser?.plan &&
      currentUser?.paymentVerified &&
      currentUser?.subscriptionExpiresAt &&
      new Date(currentUser.subscriptionExpiresAt) > new Date()
  );

  useEffect(() => {
    function redirectIfVerified() {
      const currentUser = user;
      const active = Boolean(
        currentUser?.plan &&
          currentUser?.paymentVerified &&
          currentUser?.subscriptionExpiresAt &&
          new Date(currentUser.subscriptionExpiresAt) > new Date()
      );
      if (active) navigate("/home", { replace: true });
    }

    redirectIfVerified();
    const interval = setInterval(redirectIfVerified, 4000);
    return () => clearInterval(interval);
  }, [navigate, user]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  async function handleChoose(planId) {
    setSubmittingPlan(planId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      navigate("/payment", { state: { plan: PLANS.find((p) => p.id === planId) } });
    } finally {
      setSubmittingPlan(null);
    }
  }

  if (!user) return null;

  if (subscriptionActive) return <Navigate to="/home" replace />;


  return (
    <div className="sub-page">
      <header className="sub-header">
        <Logo />
        <button type="button" className="btn btn-ghost" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main className="sub-main">
        <div className="sub-intro">
          <h1>Welcome to GalleryODDS, {(user.username || user.fullName).split(" ")[0]}</h1>
          <p>Please choose a subscription plan.</p>
        </div>

        {user.plan && (
          <div className="sub-current">
            <span className="badge badge-success">Current plan: {capitalize(user.plan)}</span>
            <span className="sub-current-price">${user.planPrice} {user.plan === "weekly" ? "/ week" : "/ month"}</span>
          </div>
        )}

        {confirmation && (
          <Notification
            type="success"
            message={confirmation}
            onDismiss={() => setConfirmation("")}
          />
        )}

        <div className="odds-links">
          <button type="button" className="odds-link odds-link-free" onClick={() => navigate("/odds/free")}>
            Free odds of the day
          </button>
          <button type="button" className="odds-link odds-link-premium" onClick={() => navigate("/odds/premium")}>
            Premium odds of the day
          </button>
        </div>

        <div className="plan-grid">
          {PLANS.map((plan) => {
            const isCurrent = user.plan === plan.id;
            return (
              <article
                key={plan.id}
                className={`plan-card ${plan.highlight ? "plan-card-highlight" : ""} ${
                  isCurrent ? "plan-card-current" : ""
                }`}
              >
                {plan.highlight && <span className="plan-tag">Most popular</span>}
                {isCurrent && <span className="plan-tag plan-tag-current">Current plan</span>}

                <h2>{plan.name}</h2>
                <div className="plan-price">
                  <span className="plan-price-amount">{plan.price}</span>
                  <span className="plan-price-alternate">{plan.alternatePrice}</span>
                  <span className="plan-price-cadence">{plan.cadence}</span>
                </div>

                <ul className="plan-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`btn btn-block ${isCurrent ? "btn-ghost" : "btn-primary"}`}
                  disabled={submittingPlan === plan.id}
                  onClick={() => handleChoose(plan.id)}
                >
                  {submittingPlan === plan.id
                    ? "Processing…"
                    : isCurrent
                    ? "Current plan"
                    : `Choose ${plan.name}`}
                </button>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
