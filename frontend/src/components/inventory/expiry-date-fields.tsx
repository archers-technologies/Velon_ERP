import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ExpiryDateFieldsProps = {
  enabled: boolean;
  mfgDate: string;
  expiryDate: string;
  onMfgDateChange: (value: string) => void;
  onExpiryDateChange: (value: string) => void;
  idPrefix?: string;
};

export function ExpiryDateFields({
  enabled,
  mfgDate,
  expiryDate,
  onMfgDateChange,
  onExpiryDateChange,
  idPrefix = 'expiry',
}: ExpiryDateFieldsProps) {
  if (!enabled) return null;

  const invalidRange =
    mfgDate && expiryDate && expiryDate < mfgDate
      ? 'Expiry date cannot be earlier than manufacturing date.'
      : null;

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <p className="text-muted-foreground text-xs">
        Enter batch dates for this stock entry. Different batches can have different dates.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-mfg`}>MFG Date</Label>
          <Input
            id={`${idPrefix}-mfg`}
            type="date"
            value={mfgDate}
            onChange={(e) => onMfgDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-exp`}>EXP Date</Label>
          <Input
            id={`${idPrefix}-exp`}
            type="date"
            value={expiryDate}
            onChange={(e) => onExpiryDateChange(e.target.value)}
          />
        </div>
      </div>
      {invalidRange ? <p className="text-destructive text-xs">{invalidRange}</p> : null}
    </div>
  );
}

export function ExpiryStatusBadge({ status }: { status?: string }) {
  if (!status || status === 'no_expiry') return null;
  if (status === 'expired') {
    return (
      <span className="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-[10px] font-medium uppercase">
        Expired
      </span>
    );
  }
  if (status === 'expiring_soon') {
    return (
      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 uppercase dark:text-amber-400">
        Expiring soon
      </span>
    );
  }
  return null;
}
