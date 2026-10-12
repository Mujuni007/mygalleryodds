import "./Notification.css";

/**
 * A single inline notification banner. `type` drives the color and icon:
 * "success" | "error" | "info".
 */
export default function Notification({ type = "info", message, onDismiss }) {
  if (!message) return null;

  return (
    <div className={`notification notification-${type}`} role="status">
      <span className="notification-dot" aria-hidden="true" />
      <span className="notification-message">{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="notification-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      )}
    </div>
  );
}
