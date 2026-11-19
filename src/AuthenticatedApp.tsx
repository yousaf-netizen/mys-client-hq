import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MfaChallenge } from '@/components/auth/MfaChallenge';
import { SignInForm } from '@/components/auth/SignInForm';
import { OwnerSetupWizard } from '@/components/onboarding/OwnerSetupWizard';
import { Button } from '@/components/ui/button';
import { lazyNamed } from '@/features/lazy';
import { lockEncryptionSession } from '@/features/messages/keySession';
import type { ShellProps } from '@/features/types';
import { AuthProvider, useAuth } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';
import { getSupabase, supabaseConfigured } from '@/lib/supabase';

const OwnerApp = lazyNamed(() => import('@/OwnerApp'), 'OwnerApp');
const PortalApp = lazyNamed(() => import('@/PortalApp'), 'PortalApp');

function Centered({ children }: { children: ReactNode }) {
  return <main className="flex min-h-svh items-center justify-center p-4">{children}</main>;
}

function Waiting({ text }: { text: string }) {
  return (
    <Centered>
      <p className="text-muted-foreground">{text}</p>
    </Centered>
  );
}

/** The organization's display name, readable before sign-in. Null until known. */
function useOrgName(): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getSupabase()
      .rpc('get_org_branding')
      .then(
        ({ data }) => {
          const value = (data as { display_name?: unknown } | null)?.display_name;
          if (!cancelled && typeof value === 'string') setName(value);
        },
        () => {
          // The name is decoration; the sign-in form works without it.
        },
      );
    return () => {
      cancelled = true;
    };
  }, []);
  return name;
}

/**
 * One recovery path: a password-reset link lands on the public /reset-password page
 * (settings' ResetPasswordPage), which reads the token from the address, sets the new
 * password over Auth's REST API and signs every session out. That route is public, so this
 * gate and its Supabase client (which would otherwise turn the link's token into a session
 * on its own) never load for it, and the gate has no set-new-password screen of its own.
 */
function Gate() {
  const { session, isLoadingAuth, mfaGate, principal, logout } = useAuth();
  const orgName = useOrgName();

  const userId = session?.user?.id ?? null;
  const principalKey = `${userId ?? ''}:${principal}`;
  const [clearedFor, setClearedFor] = useState<string | null>(null);
  const [setupState, setSetupState] = useState<'checking' | 'required' | 'complete' | 'error'>('checking');

  useEffect(() => {
    queryClient.clear();
    lockEncryptionSession();
    setClearedFor(principalKey);
  }, [principalKey]);

  useEffect(() => {
    if (principal !== 'owner') {
      setSetupState('complete');
      return;
    }
    let cancelled = false;
    setSetupState('checking');
    void getSupabase().from('org_profile').select('brand').eq('id', true).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setSetupState('error');
        return;
      }
      const brand = data.brand && typeof data.brand === 'object' ? data.brand as Record<string, unknown> : {};
      setSetupState(typeof brand.setup_completed_at === 'string' ? 'complete' : 'required');
    });
    return () => { cancelled = true; };
  }, [principal, userId]);

  if (isLoadingAuth) return <Waiting text="Loading..." />;
  if (!session) {
    return (
      <Centered>
        <SignInForm orgName={orgName} />
      </Centered>
    );
  }
  if (mfaGate === 'checking') return <Waiting text="Checking your session..." />;
  if (mfaGate === 'required') {
    return (
      <Centered>
        <MfaChallenge />
      </Centered>
    );
  }
  if (principal === 'checking' || clearedFor !== principalKey) return <Waiting text="Checking your account..." />;

  const shell: ShellProps = { orgName, email: session.user.email ?? '', onSignOut: () => void logout() };

  if (principal === 'owner') {
    if (setupState === 'checking') return <Waiting text="Preparing your workspace..." />;
    if (setupState === 'error') {
      return <Centered><div className="max-w-md text-center"><p>We could not check your workspace setup.</p><p className="mt-2 text-sm text-muted-foreground">Refresh the page. If the problem continues, contact support before adding client data.</p><Button className="mt-4" variant="outline" onClick={() => void logout()}>Sign out</Button></div></Centered>;
    }
    if (setupState === 'required') return <OwnerSetupWizard onComplete={() => setSetupState('complete')} />;
    return (
      <Suspense fallback={<Waiting text="Loading..." />}>
        <OwnerApp {...shell} />
      </Suspense>
    );
  }
  if (principal === 'client') {
    return (
      <Suspense fallback={<Waiting text="Loading..." />}>
        <PortalApp {...shell} />
      </Suspense>
    );
  }

  return (
    <Centered>
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        {principal === 'error' ? (
          <p>Could not confirm your account. Check that your Supabase project is reachable.</p>
        ) : (
          <>
            <p>This account is not the owner of this CRM.</p>
            <p className="text-sm text-muted-foreground">
              It has no client portal access either. Sign out, then sign in with the account you were invited with.
            </p>
          </>
        )}
        <Button variant="outline" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    </Centered>
  );
}

export function AuthenticatedApp() {
  if (!supabaseConfigured) {
    return (
      <Centered>
        <p className="max-w-md text-center text-muted-foreground">
          This clone is not connected to a Supabase project yet. Follow &ldquo;Running it&rdquo; in the
          README (it ends with <code>npm run dev:bootstrap</code>), then restart <code>npm run dev</code>.
        </p>
      </Centered>
    );
  }
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Gate />
      </QueryClientProvider>
    </AuthProvider>
  );
}
