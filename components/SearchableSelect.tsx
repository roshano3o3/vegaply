"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}

export default function SearchableSelect({ value, onChange, options, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const showCustom =
    query.trim() &&
    !options.some((o) => o.toLowerCase() === query.toLowerCase());

  return (
    <div ref={ref} className="relative w-full">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full px-5 py-4 rounded-xl text-white text-base outline-none transition-all"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        onFocusCapture={(e) => (e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)")}
        onBlurCapture={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
      />
      {open && (filtered.length > 0 || showCustom) && (
        <div
          className="absolute z-50 w-full mt-2 rounded-xl overflow-hidden max-h-64 overflow-y-auto"
          style={{
            background: "rgba(15,15,20,0.98)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          }}
        >
          {showCustom && (
            <button
              onClick={() => { onChange(query); setOpen(false); }}
              className="w-full text-left px-5 py-3 text-sm transition-colors flex items-center gap-2"
              style={{ color: "#fbbf24" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(251,191,36,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span>+</span> Use &ldquo;{query}&rdquo;
            </button>
          )}
          {filtered.map((opt) => (
            <button
              key={opt}
              onClick={() => { setQuery(opt); onChange(opt); setOpen(false); }}
              className="w-full text-left px-5 py-3 text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.85)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
