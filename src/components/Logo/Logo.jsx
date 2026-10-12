import "./Logo.css";

/**
 * The mark is three offset rules over a folded corner — a quiet nod to a
 * "galley": the proof sheet of typeset column rules a printer checks before
 * a page goes to press.
 */
export default function Logo({ size = "md" }) {
  return (
    <div className={`logo logo-${size}`}>
      <svg viewBox="0 0 32 32" className="logo-mark" aria-hidden="true">
        <rect x="2" y="2" width="28" height="28" rx="8" fill="var(--indigo)" />
        <path d="M9 11H23" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M9 16H23" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
        <path d="M9 21H17" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.65" />
      </svg>
      <span className="logo-word">
        Gallery<span className="logo-word-accent">ODDS</span>
      </span>
    </div>
  );
}
