"use client";

import { useState } from "react";

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API not available */
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleCopy}
        className="btn btn-circle btn-sm btn-ghost"
        title="Link másolása"
      >
        🔗
      </button>

      {copied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-neutral px-2 py-1 text-xs text-neutral-content shadow animate-fade-in">
          Link másolva!
        </span>
      )}
    </div>
  );
}
