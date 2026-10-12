import React from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../../components/Logo/Logo";
import Notification from "../../components/Notification/Notification";
import { useAuth } from "../../context/AuthContext";
import { copyTextToClipboard } from "../../services/clipboard";
import "./Payment.css";

const DEFAULT_PLAN = {
  id: "monthly",
  name: "Monthly",
  price: "UGX100000",
  alternatePrice: "$30",
  cadence: "per month",
};

const MAX_STORED_IMAGE_BYTES = 600 * 1024;

async function compressReceipt(file) {
  const previewUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Unable to read that screenshot. Please choose it again."));
      element.src = previewUrl;
    });

    const initialScale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    let width = Math.max(1, Math.round(image.naturalWidth * initialScale));
    let height = Math.max(1, Math.round(image.naturalHeight * initialScale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot prepare the screenshot. Try another image.");

    for (let resizeAttempt = 0; resizeAttempt < 5; resizeAttempt += 1) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      for (const quality of [0.82, 0.74, 0.66, 0.58]) {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (blob && blob.size <= MAX_STORED_IMAGE_BYTES) {
          const imageData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Unable to prepare the screenshot. Please try again."));
            reader.readAsDataURL(blob);
          });
          return imageData;
        }
      }

      width = Math.round(width * 0.8);
      height = Math.round(height * 0.8);
    }

    throw new Error("This screenshot could not be reduced enough to upload. Please choose a smaller image.");
  } finally {
    URL.revokeObjectURL(previewUrl);
  }
}

export default function Payment() {
  const { user, chooseSubscription, savePaymentProof, logout } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const plan = state?.plan || DEFAULT_PLAN;
  const [method, setMethod] = useState("mtn");
  const [copyStatus, setCopyStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState("");
  const paymentDestination = method === "mtn"
    ? { label: "MTN Mobile Money number", value: "0776491230", copyLabel: "Copy number" }
    : { label: "USDT · TRC20 address", value: "TDAMhRst1d1GLHuQ3VorDXVJcf5UGQ3ARS", copyLabel: "Copy address" };

  useEffect(() => {
    if (!receipt) {
      setReceiptPreviewUrl("");
      return undefined;
    }
    const previewUrl = URL.createObjectURL(receipt);
    setReceiptPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [receipt]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  async function handleCopyDestination() {
    try {
      await copyTextToClipboard(paymentDestination.value);
      setCopied(true);
      setCopyStatus("Copied to clipboard.");
    } catch {
      setCopied(false);
      setCopyStatus("Copy failed. Please select the destination and copy it manually.");
    }
  }

  function handleReceiptChange(event) {
    const file = event.target.files?.[0] || null;
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setReceipt(null);
      setError("Please choose a PNG, JPG, or WEBP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setReceipt(null);
      setError("That screenshot is too large. Please choose an image under 10 MB.");
      event.target.value = "";
      return;
    }
    setReceipt(file);
  }

  function clearReceipt() {
    setReceipt(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!receipt) {
      setError("Please upload a screenshot of your completed payment.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const imageData = await compressReceipt(receipt);
      await savePaymentProof({
        fileName: receipt.name,
        imageData,
        method,
        plan: plan.id,
        uploadedAt: new Date().toISOString(),
      });
      await chooseSubscription(plan.id);
      navigate("/payment-submitted", {
        state: { planName: plan.name },
      });
    } catch (err) {
      setError(err.message || "Unable to save payment proof. Try again.");
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="payment-page">
      <header className="payment-header">
        <Logo />
        <button type="button" className="btn btn-ghost" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main className="payment-main">
        <button type="button" className="payment-back" onClick={() => navigate("/subscription")}>
          ← Back to plans
        </button>
        <div className="payment-heading">
          <span className="badge badge-neutral">Step 2 of 2</span>
          <h1>Complete your payment</h1>
          <p>Send the payment, then upload its screenshot for review.</p>
        </div>

        <div className="payment-layout">
          <section className="payment-card payment-methods">
            <div className="payment-section-heading">
              <span className="payment-step">01</span>
              <div>
                <h2>Choose a payment method</h2>
                <p>Selected plan: {plan.name} · {plan.price} {plan.cadence}</p>
              </div>
            </div>

            <div className="method-list">
              <button
                type="button"
                className={`method-option ${method === "mtn" ? "method-option-selected" : ""}`}
                onClick={() => {
                  setMethod("mtn");
                  setCopied(false);
                  setCopyStatus("");
                }}
              >
                <span className="method-mark method-mark-mtn">M</span>
                <span className="method-copy">
                  <strong>MTN Mobile Money</strong>
                  <small>Mobile Money</small>
                </span>
                <span className="method-radio" aria-hidden="true" />
              </button>

              <button
                type="button"
                className={`method-option ${method === "crypto" ? "method-option-selected" : ""}`}
                onClick={() => {
                  setMethod("crypto");
                  setCopied(false);
                  setCopyStatus("");
                }}
              >
                <span className="method-mark method-mark-crypto">₮</span>
                <span className="method-copy">
                  <strong>USDT · TRC20</strong>
                  <small>TRC20 network</small>
                </span>
                <span className="method-radio" aria-hidden="true" />
              </button>
            </div>

            <div className={`payment-destination ${method === "crypto" ? "payment-destination-crypto" : ""}`}>
              <span className="payment-destination-label">{paymentDestination.label}</span>
              <strong className="payment-destination-value">{paymentDestination.value}</strong>
              <button
                type="button"
                className={`payment-copy-button ${copied ? "is-copied" : ""}`}
                onClick={handleCopyDestination}
              >
                {copied ? "Copied" : paymentDestination.copyLabel}
              </button>
              <span className="payment-copy-status" role="status" aria-live="polite">
                {copyStatus}
              </span>
            </div>
          </section>

          <form className="payment-card payment-form" onSubmit={handleSubmit}>
            <div className="payment-section-heading">
              <span className="payment-step">02</span>
              <div>
                <h2>Upload payment proof</h2>
                <p>Use a clear screenshot of the transaction details, including the date and time.</p>
              </div>
            </div>

            <label className="receipt-upload">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleReceiptChange}
              />
              <span className="upload-icon">↑</span>
              <strong>{receipt ? receipt.name : "Choose screenshot"}</strong>
              <small>PNG, JPG or WEBP · up to 10 MB (compressed securely before upload)</small>
            </label>

            {receipt && (
              <div className="receipt-preview">
                <img src={receiptPreviewUrl} alt="Selected payment screenshot" />
                <button type="button" className="btn btn-ghost" onClick={clearReceipt} disabled={submitting}>
                  Remove and choose another
                </button>
              </div>
            )}

            {error && <Notification type="error" message={error} />}

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit payment proof"}
            </button>
            <p className="payment-note">Your plan will be unlocked in 5 minutes.</p>
          </form>
        </div>

        <a
          className="btn payment-whatsapp-help"
          href="https://wa.me/256776491230"
          target="_blank"
          rel="noreferrer"
        >
          Customer care help on WhatsApp
        </a>
      </main>
    </div>
  );
}