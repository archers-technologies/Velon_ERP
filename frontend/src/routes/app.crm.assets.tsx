import { useCallback, useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { canWriteCrmRecords, normalizeVelonRole } from '@velon/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModuleEmptyState } from '@/components/workspace/module-empty-state';
import { getSessionMembershipRole } from '@/lib/auth/session';
import {
  createCompanyAsset,
  deleteCompanyAsset,
  downloadCompanyAsset,
  fileToBase64,
  loadCompanyAssets,
  type CompanyLibraryAsset,
  type CompanyLibraryAssetCategory,
} from '@/lib/crm/company-assets-api';

const categories: CompanyLibraryAssetCategory[] = [
  'COMPANY_PROFILE',
  'PRODUCT_CATALOG',
  'BROCHURE',
  'CERTIFICATION',
  'LICENSE',
  'CASE_STUDY',
  'AWARD',
  'PRESENTATION',
  'MARKETING',
  'OTHER',
];

export const Route = createFileRoute('/app/crm/assets')({
  component: CrmAssetsPage,
});

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function CrmAssetsPage() {
  const canWrite = canWriteCrmRecords(normalizeVelonRole(getSessionMembershipRole() ?? 'USER'));
  const [rows, setRows] = useState<CompanyLibraryAsset[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'OTHER' as CompanyLibraryAssetCategory,
    description: '',
    file: null as File | null,
  });

  const refresh = useCallback(async () => {
    const data = await loadCompanyAssets({
      search: search || undefined,
      category:
        categoryFilter !== 'all' ? (categoryFilter as CompanyLibraryAssetCategory) : undefined,
    });
    setRows(data);
  }, [search, categoryFilter]);

  useEffect(() => {
    void refresh().catch((e) => toast.error(String(e)));
  }, [refresh]);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !form.file || !form.name.trim()) return;
    setBusy(true);
    try {
      const fileBase64 = await fileToBase64(form.file);
      await createCompanyAsset({
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || undefined,
        mimeType: form.file.type || 'application/octet-stream',
        fileName: form.file.name,
        fileBase64,
      });
      toast.success('Asset uploaded');
      setForm({ name: '', category: 'OTHER', description: '', file: null });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search assets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={categoryFilter}
          onValueChange={setCategoryFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem
                key={c}
                value={c}
              >
                {c.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="secondary"
          onClick={() => void refresh()}
        >
          Search
        </Button>
      </div>

      {canWrite && (
        <Card className="border-border bg-card p-6">
          <h2 className="font-semibold">Upload asset</h2>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={onUpload}
          >
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm({ ...form, category: v as CompanyLibraryAssetCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                    >
                      {c.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>File</Label>
              <Input
                type="file"
                onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={busy || !form.file}
              className="w-fit"
            >
              Upload
            </Button>
          </form>
        </Card>
      )}

      <Card className="border-border bg-card divide-y">
        {rows.map((asset) => (
          <div
            key={asset.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-medium">{asset.name}</p>
              <p className="text-muted-foreground text-xs">
                {asset.fileName} · {formatBytes(asset.sizeBytes)} ·{' '}
                {asset.category.replace(/_/g, ' ')}
              </p>
              {asset.description && (
                <p className="text-muted-foreground mt-1 text-sm">{asset.description}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{asset.mimeType}</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void downloadCompanyAsset(asset.id, asset.fileName).catch((err) =>
                    toast.error(err instanceof Error ? err.message : 'Download failed'),
                  )
                }
              >
                Download
              </Button>
              {canWrite && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void deleteCompanyAsset(asset.id)
                      .then(refresh)
                      .then(() => toast.success('Deleted'))
                      .catch((err) =>
                        toast.error(err instanceof Error ? err.message : 'Delete failed'),
                      )
                  }
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <ModuleEmptyState
            icon={FolderOpen}
            title="No assets yet"
            description="Upload company brochures, certifications, and marketing files for use in quotations."
          />
        )}
      </Card>
    </div>
  );
}
