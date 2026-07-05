import { Link } from '@tanstack/react-router';
import { LogOut, Settings, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getSessionUserEmail } from '@/lib/auth/session';
import { signOutAdmin } from '@/lib/auth/sign-out';

function adminInitials(email: string | null, fallback: string): string {
  if (!email) return fallback;
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return (local.slice(0, 2) || fallback).toUpperCase();
}

export function AdminUserMenu({ fallbackInitials = 'SA' }: { fallbackInitials?: string }) {
  const email = getSessionUserEmail('admin');
  const initials = adminInitials(email, fallbackInitials);

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
            <p className="text-sm leading-none font-semibold">Super Admin</p>
            {email ? <p className="text-muted-foreground text-xs">{email}</p> : null}
            <p className="text-muted-foreground text-xs">Platform control plane</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/admin/settings">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/admin/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => signOutAdmin()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
