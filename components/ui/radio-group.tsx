import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
  hint?: string;
}

export interface RadioGroupProps {
  name: string;
  options: readonly RadioOption[];
  defaultValue?: string;
  legend: string;
  "data-testid"?: string;
  className?: string;
}

export function RadioGroup({
  name,
  options,
  defaultValue,
  legend,
  className,
  ...rest
}: RadioGroupProps) {
  return (
    <fieldset className={cn("space-y-2", className)} data-testid={rest["data-testid"]}>
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-3"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
              data-testid={`${name}-option-${option.value}`}
            />
            <span className="text-base text-foreground">{option.label}</span>
            {option.hint ? (
              <span className="text-sm text-muted-foreground">{option.hint}</span>
            ) : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
