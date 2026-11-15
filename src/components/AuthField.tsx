import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  id: string; label: string; type: string; autoComplete: string; value: string; error?: string;
  onChange: (v: string) => void; pin?: boolean; secret?: boolean;
};

export function AuthField({ id, label, type, autoComplete, value, error, onChange, pin, secret }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="mt-5">
      <label htmlFor={id} className="text-base font-semibold text-foreground">{label} <span aria-hidden className="text-primary">*</span></label>
      <div className="relative">
        <input
          id={id} type={secret && show ? "text" : type} required autoComplete={autoComplete} value={value}
          aria-invalid={!!error}
          {...(pin ? { inputMode: "numeric" as const, maxLength: 4, pattern: "[0-9]{4}" } : {})}
          onChange={(e) => onChange(pin ? e.target.value.replace(/\D/g, "").slice(0, 4) : e.target.value)}
          className={`field-input mt-2 ${pin ? "tracking-[0.5em]" : ""}`}
          style={secret ? { paddingRight: "3.5rem" } : undefined}
        />
        {secret && (
          <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-controls={id}
            aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} className="field-toggle">
            {show ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-1 text-destructive">{error}</p>}
    </div>
  );
}

export function AuthIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
        Pause is a bedtime scrolling assistant. You set the time you want to stop, Pause sounds a gentle alarm an hour
        before it, and then keeps an honest record of whether you stopped or kept going.
      </p>
      <h1 className="mt-7 font-display text-4xl leading-tight">{title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>
    </>
  );
}
