import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Upload } from "lucide-react";
import {
  listTenantFiles,
  registerTenantFile,
  type TenantFileRecord,
} from "@/lib/tenants/files-api";

export const Route = createFileRoute("/app/documents")({
  component: DocumentsPage,
});

function formatFileSize(bytes: number) {
  if (bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<TenantFileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    setFiles(await listTenantFiles());
  }, []);

  useEffect(() => {
    void refresh()
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not load documents"))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function onFileSelected(selected: FileList | null) {
    const file = selected?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await registerTenantFile({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
      toast.success(`${file.name} added to your file vault`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Card className="border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">File Vault</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Store invoices, contracts, and compliance documents for your workspace.
          </p>
        </div>
        <Button
          type="button"
          className="bg-foreground text-background hover:bg-foreground/90"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-4 w-4" />
          )}
          Upload file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => void onFileSelected(e.target.files)}
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading documents…
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">No documents yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload your first file to start building your workspace document library.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 rounded-lg"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Upload file
          </Button>
        </div>
      ) : (
        <ul className="space-y-2 text-sm">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium text-foreground">{file.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                <span>{formatFileSize(file.sizeBytes)}</span>
                <span>{format(parseISO(file.createdAt), "MMM d, yyyy")}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
