import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../../components/Logo/Logo";
import { useAuth } from "../../context/AuthContext";
import "./PaymentSubmitted.css";

export default function PaymentSubmitted() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const planName = state?.planName || "selected";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <div className="payment-submitted-page">
      <header className="payment-submitted-header">
        <Logo />
        <button type="button" className="btn btn-ghost" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main className="payment-submitted-main">
        <section className="payment-submitted-card">
          <span className="payment-success-mark">✓</span>
          <span className="badge badge-success">Payment received</span>
          <h1>Payment submitted for the {planName} plan</h1>
          <p>You will be verified in 5 minutes. Thank you.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/home")}>
            Return to home
          </button>
        </section>
      </main>
    </div>
  );
}