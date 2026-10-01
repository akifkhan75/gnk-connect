import * as React from 'react';
import { Eye, EyeOff, Search, Upload, FileText, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatBytes } from '../lib/format';

const control =
  'w-full rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-[0_1px_1px_hsl(240_6%_10%/0.03)] transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/60 hover:border-border-strong focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/15';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(control, 'h-9', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 3, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn(control, 'py-2', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      control,
      'h-9 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-[position:right_0.6rem_center] bg-no-repeat pr-8',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { label?: React.ReactNode }
>(({ className, label, id, ...props }, ref) => {
  const auto = React.useId();
  const inputId = id ?? auto;
  return (
    <label
      htmlFor={inputId}
      className={cn('inline-flex cursor-pointer items-start gap-2.5 text-sm', className)}
    >
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-input accent-[hsl(var(--primary))]"
        {...props}
      />
      {label && <span className="leading-snug">{label}</span>}
    </label>
  );
});
Checkbox.displayName = 'Checkbox';

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn('text-[13px] font-medium tracking-[-0.01em] text-foreground', className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden>
          *
        </span>
      )}
    </label>
  );
}

/** Label + control + hint/error. Pass `error` from react-hook-form's formState. */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  // Link the label, hint and error to a single control so screen readers announce them.
  const auto = React.useId();
  const only = React.Children.count(children) === 1 && React.isValidElement(children);
  const child = only
    ? (children as React.ReactElement<{
        id?: string;
        'aria-describedby'?: string;
        'aria-invalid'?: boolean | 'true' | 'false';
      }>)
    : null;
  const id = htmlFor ?? child?.props.id ?? (child ? auto : undefined);
  const noteId = error || hint ? `${id ?? auto}-note` : undefined;
  const control = child
    ? React.cloneElement(child, {
        id,
        'aria-describedby':
          [child.props['aria-describedby'], noteId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : child.props['aria-invalid'],
      })
    : children;
  return (
    <div className={cn('grid gap-1.5', className)}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {control}
      {error ? (
        <p id={noteId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={noteId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ className, ...props }, ref) => {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input
        ref={ref}
        type={show ? 'text' : 'password'}
        className={cn('pr-10', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

/**
 * Input that formats as the user types (CNIC, phone, NTN, passport).
 * Works with react-hook-form's register(): the formatted value is what gets submitted;
 * the shared Zod schema normalises it.
 */
export const MaskedInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { mask: (v: string) => string }
>(({ mask, onChange, ...props }, ref) => (
  <Input
    ref={ref}
    {...props}
    onChange={(e) => {
      const next = mask(e.target.value);
      if (next !== e.target.value) e.target.value = next;
      onChange?.(e);
    }}
  />
));
MaskedInput.displayName = 'MaskedInput';

export function SearchInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input type="search" className="pl-9" {...props} />
    </div>
  );
}

/** Drag-and-drop or click-to-pick file control for PDF/JPEG/PNG documents. */
export function FileDrop({
  value,
  onChange,
  accept = 'application/pdf,image/jpeg,image/png,image/webp',
  maxBytes = 15 * 1024 * 1024,
  label = 'Drop a file here or click to browse',
  hint = 'PDF, JPG or PNG up to 15 MB',
  disabled,
  error,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxBytes?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
  error?: string;
}) {
  const [drag, setDrag] = React.useState(false);
  const [localError, setLocalError] = React.useState<string>();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pick = (file?: File | null) => {
    setLocalError(undefined);
    if (!file) return;
    if (file.size > maxBytes) return setLocalError(`File is larger than ${formatBytes(maxBytes)}`);
    onChange(file);
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5">
        <FileText className="size-5 shrink-0 text-link" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{value.name}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(value.size)}</p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Remove file"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  }
  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-border-strong bg-surface-sunken/70 px-4 py-6 text-center transition-colors hover:border-ring hover:bg-accent-soft/60 disabled:opacity-60',
          drag && 'border-ring bg-accent-soft',
          (error || localError) && 'border-danger',
        )}
      >
        <Upload className="size-5 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {(error || localError) && (
        <p className="mt-1.5 text-xs font-medium text-danger">{error || localError}</p>
      )}
    </div>
  );
}
