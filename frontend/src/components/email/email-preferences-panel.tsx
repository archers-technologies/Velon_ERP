import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { loadEmailPreferences, updateEmailPreferences } from '@/lib/email/api';

export function EmailPreferencesPanel() {
  const [prefs, setPrefs] = useState({
    billingAlertsEnabled: true,
    securityAlertsEnabled: true,
    productUpdatesOptIn: false,
    marketingOptIn: false,
    trainingAnnouncementsOptIn: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadEmailPreferences()
      .then((data) => {
        setPrefs({
          billingAlertsEnabled: data.billingAlertsEnabled,
          securityAlertsEnabled: data.securityAlertsEnabled,
          productUpdatesOptIn: data.productUpdatesOptIn,
          marketingOptIn: data.marketingOptIn,
          trainingAnnouncementsOptIn: data.trainingAnnouncementsOptIn,
        });
      })
      .catch(() => toast.error('Could not load email preferences'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (patch: Partial<typeof prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      await updateEmailPreferences(patch);
    } catch {
      toast.error('Could not save email preferences');
    }
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading email preferences…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Email preferences</h3>
        <p className="text-muted-foreground text-sm">
          Transactional billing and security emails are always sent when required. Marketing and
          product updates require your opt-in.
        </p>
      </div>

      <div className="space-y-4">
        <PreferenceRow
          description="Payment receipts, failed payment notices, renewal reminders."
          checked={prefs.billingAlertsEnabled}
          label="Billing alerts"
          onCheckedChange={(v) => void save({ billingAlertsEnabled: v })}
        />
        <PreferenceRow
          description="Password reset and security-related notifications."
          checked={prefs.securityAlertsEnabled}
          label="Security alerts"
          onCheckedChange={(v) => void save({ securityAlertsEnabled: v })}
        />
        <PreferenceRow
          description="Product improvements and feature announcements."
          checked={prefs.productUpdatesOptIn}
          label="Product updates"
          onCheckedChange={(v) => void save({ productUpdatesOptIn: v })}
        />
        <PreferenceRow
          description="Promotional offers and campaigns."
          checked={prefs.marketingOptIn}
          label="Marketing & promotions"
          onCheckedChange={(v) => void save({ marketingOptIn: v })}
        />
        <PreferenceRow
          description="Training sessions and webinar invitations."
          checked={prefs.trainingAnnouncementsOptIn}
          label="Training & announcements"
          onCheckedChange={(v) => void save({ trainingAnnouncementsOptIn: v })}
        />
      </div>
    </div>
  );
}

function PreferenceRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div>
        <Label>{label}</Label>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
