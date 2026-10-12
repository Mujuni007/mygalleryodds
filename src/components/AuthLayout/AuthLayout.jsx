import Logo from "../Logo/Logo";
import "./AuthLayout.css";

/**
 * Two-panel shell shared by the Login and Admin Login pages: a fixed brand
 * panel on the left, and whatever form the page provides on the right.
 * `eyebrow`/`title`/`copy` let each page state its own proof-line.
 */
export default function AuthLayout({ eyebrow, title, copy, children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <Logo size="lg" />
        <div className="auth-brand-copy">
          <p className="auth-brand-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="auth-brand-lede">{copy}</p>
        </div>
        <div className="auth-brand-rules" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </aside>
      <main className="auth-panel">
        <div className="auth-panel-inner">{children}</div>
      </main>
    </div>
  );
}
