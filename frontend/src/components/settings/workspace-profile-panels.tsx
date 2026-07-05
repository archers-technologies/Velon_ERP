import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Shield, Trash2, Upload } from "lucide-react";
import { useWorkspaceUserProfile } from "@/contexts/workspace-user-profile";
import { readImageFileAsDataUrl } from "@/lib/workspace/user-profile";
import { deleteWorkspaceAccount } from "@/lib/tenants/admin-api";
import { apiChangePassword } from "@/lib/auth/password-reset-api";
import { signOutWorkspace } from "@/lib/auth/sign-out";
import { formatApiError } from "@/lib/auth/login-utils";
import { PasswordRequirementsChecklist } from "@/components/auth/password-requirements-checklist";
import { isPasswordStrong } from "@/lib/auth/password-policy";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function WorkspaceProfileIdentityPanel() {
  const { profile, initials, patchProfile, applyWorkspaceLogo } = useWorkspaceUserProfile();
  const avatarRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(profile.fullName);
  const [logoAspect, setLogoAspect] = useState(profile.workspaceLogoAspect);

  useEffect(() => {
    setFullName(profile.fullName);
    setLogoAspect(profile.workspaceLogoAspect);
  }, [profile.fullName, profile.workspaceLogoAspect]);

  async function onAvatarFile(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      patchProfile({ avatarDataUrl: dataUrl });
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function onLogoFile(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      await applyWorkspaceLogo(dataUrl, logoAspect);
      toast.success("Workspace logo updated — accent color applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function saveIdentity() {
    patchProfile({ fullName: fullName.trim() || profile.fullName });
    toast.success("Profile identity saved");
  }

  return (
    <Card className="border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Profile identity &amp; branding</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Personal avatar for comments and audit trails. Workspace logo for headers and sidebar (max
        2MB JPG/PNG).
      </p>
      <Separator className="my-5" />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar className="h-20 w-20">
            {profile.avatarDataUrl ? (
              <AvatarImage src={profile.avatarDataUrl} alt={profile.fullName} />
            ) : null}
            <AvatarFallback className="bg-foreground text-lg font-semibold text-background">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Label>Profile picture</Label>
            <p className="text-xs text-muted-foreground">1:1 square · shown in header and mentions</p>
            <input
              ref={avatarRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void onAvatarFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => avatarRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload photo
            </Button>
          </div>
        </div>
        <Separator />
        <div className="space-y-3">
          <Label>Workspace / company logo</Label>
          <p className="text-xs text-muted-foreground">
            Wide 4:1 recommended for top headers · 1:1 square for sidebar navigation
          </p>
          <div className="flex flex-wrap gap-3">
            <Select
              value={logoAspect}
              onValueChange={(v: "square" | "wide") => setLogoAspect(v)}
            >
              <SelectTrigger className="w-[180px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">1:1 Sidebar</SelectItem>
                <SelectItem value="wide">4:1 Header</SelectItem>
              </SelectContent>
            </Select>
            <input
              ref={logoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void onLogoFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => logoRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload logo
            </Button>
          </div>
          {profile.workspaceLogoDataUrl ? (
            <div
              className={
                logoAspect === "wide"
                  ? "flex h-14 max-w-md items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-4"
                  : "flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40"
              }
            >
              <img
                src={profile.workspaceLogoDataUrl}
                alt="Workspace logo preview"
                className={
                  logoAspect === "wide"
                    ? "max-h-10 max-w-full object-contain"
                    : "h-12 w-12 object-contain"
                }
              />
            </div>
          ) : null}
          {profile.brandAccentHex ? (
            <p className="text-xs text-muted-foreground">
              Brand accent:{" "}
              <span
                className="inline-block h-3 w-3 rounded-full align-middle"
                style={{ backgroundColor: profile.brandAccentHex }}
              />{" "}
              <code className="text-foreground">{profile.brandAccentHex}</code> — applied to accent
              controls and focus states
            </p>
          ) : null}
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" value={profile.email} disabled className="rounded-lg" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            className="rounded-lg bg-foreground text-background hover:bg-foreground/90"
            onClick={saveIdentity}
          >
            Save profile
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function WorkspaceSecurityPanel({ canDeleteWorkspace = false }: { canDeleteWorkspace?: boolean }) {
  const { profile, sessions, patchProfile, revokeOtherSessions } = useWorkspaceUserProfile();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  async function changePassword() {
    if (!isPasswordStrong(newPassword)) {
      toast.error("New password does not meet all requirements");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPasswordBusy(true);
    try {
      await apiChangePassword(currentPassword, newPassword);
      toast.success("Password updated. Sign in again on other devices if needed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(formatApiError(err, "Could not update password"));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function confirmDeleteWorkspace() {
    if (deleteConfirmPhrase.trim().toUpperCase() !== "DELETE") {
      toast.error('Type DELETE to confirm.');
      return;
    }
    if (deletePassword.length < 8) {
      toast.error("Enter your current password.");
      return;
    }
    setDeleteBusy(true);
    try {
      await deleteWorkspaceAccount({
        password: deletePassword,
        confirmPhrase: deleteConfirmPhrase.trim(),
      });
      toast.success("Workspace deleted. You can register again anytime.");
      signOutWorkspace();
    } catch (err) {
      toast.error(formatApiError(err, "Could not delete workspace"));
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Password</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Verify your current password before setting a new one.
        </p>
        <Separator className="my-5" />
        <div className="grid max-w-md gap-4">
          <div className="space-y-2">
            <Label htmlFor="cur-pass">Current password</Label>
            <Input
              id="cur-pass"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pass">New password</Label>
            <Input
              id="new-pass"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-lg"
            />
            <PasswordRequirementsChecklist password={newPassword} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pass">Confirm new password</Label>
            <Input
              id="confirm-pass"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="w-fit rounded-lg bg-foreground text-background hover:bg-foreground/90"
            onClick={changePassword}
            disabled={
              passwordBusy ||
              !currentPassword ||
              !isPasswordStrong(newPassword) ||
              newPassword !== confirmPassword
            }
          >
            {passwordBusy ? "Updating…" : "Update password"}
          </Button>
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Multi-factor authentication</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Authenticator-based MFA is not enabled for workspace accounts yet. Password and session
            controls below remain active.
          </p>
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Connected sessions</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Devices currently signed in to your account.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => {
              revokeOtherSessions();
              toast.success("Signed out of all other sessions");
            }}
          >
            <Shield className="mr-2 h-4 w-4" />
            Log out of all other sessions
          </Button>
        </div>
        <Separator className="my-5" />
        <ul className="space-y-3 text-sm">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5"
            >
              <div>
                <div className="font-medium">
                  {s.device}
                  {s.current ? (
                    <span className="ml-2 text-xs font-normal text-success">This device</span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">{s.location}</div>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(s.lastActive).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {canDeleteWorkspace ? (
        <Card className="border-destructive/40 bg-card p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-destructive">Cancel subscription &amp; delete workspace</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Permanently delete your company workspace, all data, and team access. You can register
                again later with the same email.
              </p>
            </div>
            <AlertDialog
              open={deleteOpen}
              onOpenChange={(open) => {
                setDeleteOpen(open);
                if (!open) {
                  setDeletePassword("");
                  setDeleteConfirmPhrase("");
                }
              }}
            >
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" className="rounded-lg shrink-0">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete workspace
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your workspace?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes your company workspace, billing data, inventory, CRM records, and all
                    team members. This action cannot be undone. Type <strong>DELETE</strong> and enter
                    your password to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="delete-confirm">Confirmation</Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirmPhrase}
                      onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                      placeholder="DELETE"
                      autoComplete="off"
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delete-password">Password</Label>
                    <Input
                      id="delete-password"
                      type="password"
                      autoComplete="current-password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="rounded-lg"
                    />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleteBusy}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={(e) => {
                      e.preventDefault();
                      void confirmDeleteWorkspace();
                    }}
                  >
                    {deleteBusy ? "Deleting…" : "Delete workspace permanently"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
