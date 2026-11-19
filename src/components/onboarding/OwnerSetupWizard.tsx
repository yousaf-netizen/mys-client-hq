import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Building2, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Panel } from '@/components/layout/page';
import { getSupabase } from '@/lib/supabase';
import { fetchOrgProfile, saveIdentity, brandColor, recordAudit, type IdentityPatch } from '@/features/settings/api';

type Props = { onComplete: () => void };

const steps = [
  { title: 'Business details', description: 'Set the details that appear across your client workspace.', icon: Building2 },
  { title: 'Brand & workspace', description: 'Give the workspace its MYS identity.', icon: Palette },
  { title: 'Security & finish', description: 'A quick final check before you open your dashboard.', icon: ShieldCheck },
];

export function OwnerSetupWizard({ onComplete }: Props) {
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['owner-setup', 'org-profile'],
    queryFn: fetchOrgProfile,
  });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('MYS Designs');
  const [legalName, setLegalName] = useState('');
  const [senderName, setSenderName] = useState('MYS Designs');
  const [contactEmail, setContactEmail] = useState('');
  const [postalAddress, setPostalAddress] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#171717');

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name || 'MYS Designs');
    setLegalName(profile.legal_name ?? '');
    setSenderName(profile.sender_name ?? 'MYS Designs');
    setContactEmail(profile.contact_email ?? '');
    setPostalAddress(profile.postal_address ?? '');
    setPrimaryColor(brandColor(profile) ?? '#171717');
  }, [profile]);

  const finish = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!profile) return;
    if (!displayName.trim()) {
      toast.error('Add your business name to continue.');
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      const patch: IdentityPatch = {
        display_name: displayName.trim(),
        legal_name: legalName.trim() || null,
        sender_name: senderName.trim() || null,
        contact_email: contactEmail.trim() || null,
        postal_address: postalAddress.trim() || null,
        primary_color: primaryColor.trim() || null,
      };
      await saveIdentity(profile, patch);
      const { data, error } = await getSupabase()
        .from('org_profile')
        .update({ brand: { ...profile.brand, primary_color: primaryColor.trim() || undefined, setup_completed_at: new Date().toISOString() } })
        .eq('id', true)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('The setup could not be saved. Refresh and try again.');
      void recordAudit('owner_setup_completed', { step_count: 3 });
      toast.success('Workspace setup complete.');
      onComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your setup. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <main className="flex min-h-svh items-center justify-center p-6"><p className="text-sm text-muted-foreground">Preparing your workspace...</p></main>;
  if (isError || !profile) return <main className="flex min-h-svh items-center justify-center p-6"><div className="max-w-md text-center"><h1 className="text-xl font-semibold">Workspace setup unavailable</h1><p className="mt-2 text-sm text-muted-foreground">Your organisation profile could not be loaded. Refresh the page or contact support before continuing.</p></div></main>;

  const active = steps[step];
  const Icon = active.icon;

  return (
    <main className="min-h-svh bg-background px-4 py-10 md:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">MYS Designs</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Set up your workspace</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">A few details now will make every client space, document and approval feel consistent.</p>
          </div>
          <div className="hidden h-12 w-12 items-center justify-center rounded-xl border bg-card md:flex"><span className="text-lg font-semibold tracking-tight">MYS</span></div>
        </header>

        <div className="grid grid-cols-3 gap-2" aria-label="Setup progress">
          {steps.map((item, index) => (
            <div key={item.title} className="flex flex-col gap-2">
              <div className={index <= step ? 'h-1.5 rounded-full bg-foreground' : 'h-1.5 rounded-full bg-muted'} />
              <span className={index === step ? 'text-xs font-medium' : 'text-xs text-muted-foreground'}>{item.title}</span>
            </div>
          ))}
        </div>

        <Panel title={<span className="flex items-center gap-2"><Icon className="h-4 w-4" />{active.title}</span>} description={active.description} bodyClassName="p-5 md:p-7">
          {step === 0 && (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setStep(1); }}>
              <div className="grid gap-1.5 md:col-span-2"><Label htmlFor="setup-display-name">Business name</Label><Input id="setup-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} required /></div>
              <div className="grid gap-1.5"><Label htmlFor="setup-legal-name">Registered company name</Label><Input id="setup-legal-name" value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={200} placeholder="Optional" /></div>
              <div className="grid gap-1.5"><Label htmlFor="setup-sender-name">Email sender name</Label><Input id="setup-sender-name" value={senderName} onChange={(e) => setSenderName(e.target.value)} maxLength={120} /></div>
              <div className="grid gap-1.5 md:col-span-2"><Label htmlFor="setup-contact-email">Public contact email</Label><Input id="setup-contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="hello@mysdesigns.co.uk" /><p className="text-xs text-muted-foreground">Shown to clients where they need to contact your business. This is not your login email.</p></div>
              <div className="grid gap-1.5 md:col-span-2"><Label htmlFor="setup-postal-address">Business postal address</Label><Textarea id="setup-postal-address" rows={3} value={postalAddress} onChange={(e) => setPostalAddress(e.target.value)} placeholder="Optional" /></div>
              <div className="flex justify-end md:col-span-2"><Button type="submit">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
            </form>
          )}

          {step === 1 && (
            <div className="grid gap-5">
              <div className="grid gap-1.5 max-w-sm"><Label htmlFor="setup-colour">Primary brand colour</Label><div className="flex items-center gap-3"><Input id="setup-colour" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} maxLength={7} /><input aria-label="Choose brand colour" type="color" value={/^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : '#171717'} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-12 cursor-pointer rounded-md border bg-transparent p-1" /></div><p className="text-xs text-muted-foreground">You can change this and upload your logo later in Settings.</p></div>
              <div className="rounded-lg border bg-muted/30 p-4"><p className="text-sm font-medium">Your workspace</p><div className="mt-3 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card font-semibold">MYS</div><div><p className="font-medium">{displayName || 'MYS Designs'}</p><p className="text-xs text-muted-foreground">Private client workspace</p></div></div></div>
              <div className="flex justify-between"><Button type="button" variant="outline" onClick={() => setStep(0)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><Button type="button" onClick={() => setStep(2)}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5">
              <div className="rounded-lg border p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5" /><div><p className="font-medium">Protect your account</p><p className="mt-1 text-sm text-muted-foreground">After setup, open Settings → Security and enable an authenticator app for two-factor authentication. Keep your recovery codes somewhere safe.</p></div></div></div>
              <div className="rounded-lg border p-4"><div className="flex items-start gap-3"><Check className="mt-0.5 h-5 w-5" /><div><p className="font-medium">Ready to open MYS Client HQ</p><p className="mt-1 text-sm text-muted-foreground">Your business identity and brand colour will be saved. You can change them any time in Settings.</p></div></div></div>
              <div className="flex justify-between"><Button type="button" variant="outline" onClick={() => setStep(1)} disabled={saving}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><Button type="button" onClick={() => void finish()} disabled={saving}>{saving ? 'Saving...' : 'Finish setup'} <Check className="ml-2 h-4 w-4" /></Button></div>
            </div>
          )}
        </Panel>
        <p className="text-center text-xs text-muted-foreground">You can update these details later from Settings. Your client workspaces stay private to their own accounts.</p>
      </div>
    </main>
  );
}
