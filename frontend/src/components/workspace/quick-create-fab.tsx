import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { WORKSPACE_QUICK_ACTIONS } from "@/lib/workspace/quick-actions";

/** Floating quick-create — thumb-friendly on mobile. */
export function QuickCreateFab() {
  return (
    <div className="fixed bottom-6 right-4 z-40 sm:right-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg shadow-primary/25 sm:h-12 sm:w-auto sm:rounded-lg sm:px-4"
            aria-label="Quick create"
          >
            <Plus className="h-6 w-6 sm:mr-2 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Quick create</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="mb-2 w-56">
          <DropdownMenuLabel>Create new</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {WORKSPACE_QUICK_ACTIONS.map((action) => (
            <DropdownMenuItem key={action.label} asChild>
              <Link to={action.to} search={action.search} className="cursor-pointer">
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
