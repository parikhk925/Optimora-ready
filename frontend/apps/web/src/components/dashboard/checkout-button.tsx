"use client";

import { useState } from "react";

export function CheckoutButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      setMessage(data.message ?? "Checkout requires setup.");
    } catch {
      setMessage("Checkout requires setup.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        data-testid="billing-checkout-button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors w-fit"
      >
        {loading ? "Checking..." : "Upgrade plan"}
      </button>
      {message && <p data-testid="billing-checkout-message" className="text-xs text-amber-600">{message}</p>}
    </div>
  );
}
