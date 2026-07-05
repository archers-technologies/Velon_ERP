import { useCallback, useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loadSiteContent, updateSiteContentBlock, type SiteContentKey } from '@/lib/cms/api';

const blocks: SiteContentKey[] = [
  'hero',
  'features',
  'pricing',
  'faq',
  'testimonials',
  'footer',
  'contact',
  'about',
  'cta',
  'privacy',
  'terms',
  'refundPolicy',
];

export const Route = createFileRoute('/admin/website')({
  component: AdminWebsitePage,
});

function AdminWebsitePage() {
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<SiteContentKey>('hero');

  const refresh = useCallback(async () => {
    setContent(await loadSiteContent());
  }, []);

  useEffect(() => {
    void refresh().catch((e) => toast.error(String(e)));
  }, [refresh]);

  async function save(key: SiteContentKey) {
    setBusy(true);
    try {
      await updateSiteContentBlock(key, content[key]);
      toast.success(`${key} saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  const hero = (content.hero ?? {}) as Record<string, string>;
  const footer = (content.footer ?? {}) as Record<string, string>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          Platform
        </p>
        <h1 className="text-2xl font-semibold">Website CMS</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Edit marketing content without code changes.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as SiteContentKey)}
      >
        <TabsList className="flex h-auto flex-wrap">
          {blocks.map((b) => (
            <TabsTrigger
              key={b}
              value={b}
              className="capitalize"
            >
              {b}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value="hero"
          className="mt-4"
        >
          <Card className="border-border bg-card space-y-4 p-6">
            <div>
              <Label>Title</Label>
              <Input
                value={hero.title ?? ''}
                onChange={(e) =>
                  setContent({ ...content, hero: { ...hero, title: e.target.value } })
                }
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input
                value={hero.subtitle ?? ''}
                onChange={(e) =>
                  setContent({ ...content, hero: { ...hero, subtitle: e.target.value } })
                }
              />
            </div>
            <div>
              <Label>CTA</Label>
              <Input
                value={hero.cta ?? ''}
                onChange={(e) => setContent({ ...content, hero: { ...hero, cta: e.target.value } })}
              />
            </div>
            <Button
              disabled={busy}
              onClick={() => void save('hero')}
            >
              Save hero
            </Button>
          </Card>
        </TabsContent>

        <TabsContent
          value="footer"
          className="mt-4"
        >
          <Card className="border-border bg-card space-y-4 p-6">
            <div>
              <Label>Tagline</Label>
              <Input
                value={footer.tagline ?? ''}
                onChange={(e) =>
                  setContent({ ...content, footer: { ...footer, tagline: e.target.value } })
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={footer.email ?? ''}
                onChange={(e) =>
                  setContent({ ...content, footer: { ...footer, email: e.target.value } })
                }
              />
            </div>
            <Button
              disabled={busy}
              onClick={() => void save('footer')}
            >
              Save footer
            </Button>
          </Card>
        </TabsContent>

        {(
          [
            'features',
            'pricing',
            'faq',
            'testimonials',
            'contact',
            'about',
            'cta',
            'privacy',
            'terms',
            'refundPolicy',
          ] as SiteContentKey[]
        ).map((key) => (
          <TabsContent
            key={key}
            value={key}
            className="mt-4"
          >
            <Card className="border-border bg-card space-y-4 p-6">
              <Label>JSON content</Label>
              <textarea
                className="border-input min-h-[200px] w-full rounded-md border bg-transparent p-3 font-mono text-xs"
                value={JSON.stringify(content[key] ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    setContent({ ...content, [key]: JSON.parse(e.target.value) });
                  } catch {
                    /* ignore while typing */
                  }
                }}
              />
              <Button
                disabled={busy}
                onClick={() => void save(key)}
              >
                Save {key}
              </Button>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
