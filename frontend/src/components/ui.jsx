import { useEffect, useRef, useState } from 'react';

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

// Angka diperbarui langsung selama masih dalam rentang, dan dibatasi (clamp) saat input ditinggalkan.
export function NumberField({ label, value, onChange, min = -99999, max = 99999, step = 1 }) {
  const [draft, setDraft] = useState(String(value));
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setDraft(String(value));
  }, [value]);

  const commit = () => {
    editing.current = false;
    const n = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <Field label={label}>
      <input
        type="number"
        value={draft}
        step={step}
        min={min}
        max={max}
        onFocus={() => {
          editing.current = true;
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = e.target.valueAsNumber;
          if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </Field>
  );
}

export function ColorField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function TextField({ label, value, onChange, maxLength }) {
  return (
    <Field label={label}>
      <input type="text" value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function AreaField({ label, value, onChange, maxLength, rows = 4, mono = false }) {
  return (
    <Field label={label}>
      <textarea
        className={mono ? 'mono' : undefined}
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

// options: [{ value, label }]. Nilai asli (angka, null, dsb.) dikembalikan apa adanya.
export function SelectField({ label, value, options, onChange }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <Field label={label}>
      <select value={String(index)} onChange={(e) => onChange(options[Number(e.target.value)].value)}>
        {options.map((o, i) => (
          <option key={i} value={String(i)}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CheckField({ label, checked, onChange, disabled }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function RangeField({ label, value, onChange, min = 0, max = 1, step = 0.01 }) {
  return (
    <Field label={`${label} (${Math.round(value * 100)}%)`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}
