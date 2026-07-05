import { Link } from '@tanstack/react-router';
import { Building2, Check, LogOut, Settings, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkspaceUserProfile } from '@/contexts/workspace-user-profile';
import { signOutWorkspace } from '@/lib/auth/sign-out';
import { readWorkspaceName } from '@/lib/workspace/tenant-workspace';

export function WorkspaceUserMenu() {
  const { profile, initials, activeTenantName, switchTenant } = useWorkspaceUserProfile();
  const workspaceName = readWorkspaceName();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="border-border h-9 w-9 rounded-full border p-0"
          aria-label="Open profile menu"
        >
          <Avatar className="h-8 w-8">
            {profile.avatarDataUrl ? (
              <AvatarImage
                src={profile.avatarDataUrl}
                alt={profile.fullName}
              />
            ) : null}
            <AvatarFallback className="bg-foreground text-background text-[11px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm leading-none font-semibold">{profile.fullName}</p>
            <p className="text-muted-foreground text-xs">{profile.email}</p>
            <p className="text-muted-foreground text-xs">
              {activeTenantName || workspaceName} · {profile.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              to="/app/settings"
              search={{ tab: 'profile' }}
            >
              <User className="mr-2 h-4 w-4" />
              My Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              to="/app/settings"
              search={{ tab: 'general' }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Workspace settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {profile.assignedTenants.length > 1 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Building2 className="mr-2 h-4 w-4" />
                Switch workspace
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {profile.assignedTenants.map((tenant) => (
                  <DropdownMenuItem
                    key={tenant.id}
                    onClick={() => switchTenant(tenant.id)}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">{tenant.name}</span>
                    {tenant.id === profile.activeTenantId ? (
                      <Check className="text-foreground h-4 w-4 shrink-0" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => signOutWorkspace()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
