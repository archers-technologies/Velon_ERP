import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { DocumentSectionEditor } from '@/components/crm/document-section-editor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { DocumentBody, DocumentSection } from '@/lib/crm/document-types';

type QuotationDocumentBuilderProps = {
  document: DocumentBody;
  onChange: (document: DocumentBody) => void;
  onSave: () => void;
  saving?: boolean;
  disabled?: boolean;
};

function moveSection(sections: DocumentSection[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= sections.length) return sections;
  const next = [...sections];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function QuotationDocumentBuilder({
  document,
  onChange,
  onSave,
  saving,
  disabled,
}: QuotationDocumentBuilderProps) {
  function updateSection(index: number, patch: Partial<DocumentSection>) {
    onChange({
      ...document,
      sections: document.sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Document sections</h2>
          <p className="text-muted-foreground text-sm">
            Reorder, show or hide sections, and edit content for the quotation PDF.
          </p>
        </div>
        <Button
          onClick={onSave}
          disabled={disabled || saving}
        >
          {saving ? 'Saving…' : 'Save document'}
        </Button>
      </div>

      <div className="space-y-3">
        {document.sections.map((section, index) => (
          <Card
            key={section.id}
            className="border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[200px] flex-1">
                    <Label htmlFor={`section-title-${section.id}`}>Title</Label>
                    <Input
                      id={`section-title-${section.id}`}
                      value={section.title}
                      disabled={disabled}
                      onChange={(e) => updateSection(index, { title: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      checked={section.visible}
                      disabled={disabled}
                      onCheckedChange={(visible) => updateSection(index, { visible })}
                    />
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      {section.visible ? (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Hidden
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Body</Label>
                  <DocumentSectionEditor
                    value={section.body}
                    disabled={disabled}
                    onChange={(body) => updateSection(index, { body })}
                  />
                </div>
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  {section.type}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={disabled || index === 0}
                  onClick={() =>
                    onChange({ ...document, sections: moveSection(document.sections, index, -1) })
                  }
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={disabled || index === document.sections.length - 1}
                  onClick={() =>
                    onChange({ ...document, sections: moveSection(document.sections, index, 1) })
                  }
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
