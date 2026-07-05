import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { PasswordRequirementsChecklist } from '@/components/auth/password-requirements-checklist';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isPasswordStrong } from '@/lib/auth/password-policy';
import { saveSession } from '@/lib/auth/session';
import { acceptInvitation, previewInvitation } from '@/lib/tenants/admin-api';

export const Route = createFileRoute('/invite/$token')({
  loader: ({ params }) => previewInvitation(params.token),
  component: InviteAcceptPage,
});

function InviteAcceptPage() {
  const navigate = useNavigate();
  const preview = Route.useLoaderData();
  const { token } = Route.useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isPasswordStrong(password)) {
      toast.error('Password does not meet all requirements.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const session = await acceptInvitation(token, password);
      saveSession({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        route: 'app',
        email: session.email,
        scope: session.scope as 'tenant',
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
      });
      toast.success(`Welcome to ${preview.workspaceName}`);
      await navigate({ to: '/app' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not accept invitation');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6">
      <Card className="border-border bg-card w-full max-w-md p-8">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          Workspace invitation
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{preview.workspaceName}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          <strong>{preview.inviterName}</strong> invited <strong>{preview.fullName}</strong> (
          {preview.email}) as {preview.role.replace(/_/g, ' ').toLowerCase()}.
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Expires {new Date(preview.expiresAt).toLocaleDateString()}
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={onSubmit}
        >
          <div>
            <Label htmlFor="password">Create password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="mt-2">
              <PasswordRequirementsChecklist password={password} />
            </div>
          </div>
          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={
              busy || !isPasswordStrong(password) || password !== confirm || confirm.length === 0
            }
          >
            {busy ? 'Joining…' : 'Join workspace'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
