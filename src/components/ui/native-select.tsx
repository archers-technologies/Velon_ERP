import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type NativeSelectOption = { value: string; label: string };

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: NativeSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
};

export function NativeSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
  required,
}: Props) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "flex h-10 w-full cursor-pointer appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        {placeholder ? (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}
