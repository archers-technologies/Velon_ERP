import { useCallback, useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { FileText, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  listTenantFiles,
  registerTenantFile,
  type TenantFileRecord,
} from '@/lib/tenants/files-api';

export const Route = createFileRoute('/app/documents')({
  component: DocumentsPage,
});

function formatFileSize(bytes: number) {
  if (bytes <= 0) return '—';
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
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Could not load documents'))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function onFileSelected(selected: FileList | null) {
    const file = selected?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await registerTenantFile({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      toast.success(`${file.name} added to your file vault`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <Card className="border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">File Vault</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
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
        <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading documents…
        </div>
      ) : files.length === 0 ? (
        <div className="border-border bg-muted/20 rounded-lg border border-dashed px-6 py-12 text-center">
          <FileText className="text-muted-foreground mx-auto h-8 w-8" />
          <p className="text-foreground mt-3 text-sm font-medium">No documents yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
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
              className="border-border bg-background flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                <span className="text-foreground truncate font-medium">{file.name}</span>
              </div>
              <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs">
                <span>{formatFileSize(file.sizeBytes)}</span>
                <span>{format(parseISO(file.createdAt), 'MMM d, yyyy')}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
