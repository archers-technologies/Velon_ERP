import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitContactInquiry } from "@/erp/erp-functions";
import { loadPublicSiteContentSafe } from "@/lib/cms/load-public";

export const Route = createFileRoute("/contact")({
  loader: () => loadPublicSiteContentSafe(),
  component: ContactPage,
});

function ContactPage() {
  const siteContent = Route.useLoaderData();
  const contact = siteContent.contact;
  const submitFn = useServerFn(submitContactInquiry);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await submitFn({
        data: {
          fullName: fullName.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
          phone: phone.trim() || undefined,
          message: message.trim(),
        },
      });
      toast.success("Thanks — your inquiry was received.");
      setFullName("");
      setEmail("");
      setCompany("");
      setPhone("");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingPageShell
      label="Contact"
      title={contact.headline}
      description="Share your business requirements and we will suggest the best plan, module setup and onboarding path."
      siteContent={siteContent}
    >
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
        <Card className="border-border bg-card p-6 md:col-span-1">
          <h3 className="font-semibold">Contact details</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>
                <a href={`mailto:${contact.email}`} className="hover:underline">
                  {contact.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{contact.phone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Address</dt>
              <dd>{contact.address}</dd>
            </div>
          </dl>
        </Card>
        <Card className="border-border bg-card p-6 md:col-span-2">
          <form onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                placeholder="Work email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                placeholder="Company name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
              <Input
                placeholder="Phone number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Textarea
              className="mt-4"
              rows={5}
              placeholder="Tell us what you want to solve..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <Button
              type="submit"
              disabled={busy}
              className="mt-4 bg-foreground text-background hover:bg-foreground/90"
            >
              {busy ? "Sending…" : "Send inquiry"}
            </Button>
          </form>
        </Card>
      </div>
    </MarketingPageShell>
  );
}
