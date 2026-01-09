'use client';

import { api } from '@/lib/api-client';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { AlertCircle, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface OAuthSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerSlug: string;
  providerName: string;
  providerLogoUrl: string;
  onSuccess: () => void;
}

interface SetupInfo {
  callbackUrl: string;
  setupInstructions: string;
  createAppUrl: string;
  requiredScopes: string[];
}

export function OAuthSetupDialog({
  open,
  onOpenChange,
  providerSlug,
  providerName,
  onSuccess,
}: OAuthSetupDialogProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const [step, setStep] = useState<'info' | 'credentials'>('info');
  const [setupInfo, setSetupInfo] = useState<SetupInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchSetupInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<SetupInfo>(
        `/v1/integrations/oauth-apps/setup/${providerSlug}?organizationId=${orgId}`,
        orgId,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      setSetupInfo(response.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load setup information');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !setupInfo) {
      fetchSetupInfo();
    }
    if (!isOpen) {
      // Reset state when closing
      setStep('info');
      setClientId('');
      setClientSecret('');
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleSaveCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Client ID and Client Secret are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api.post<{ success: boolean }>(
        '/v1/integrations/oauth-apps',
        {
          providerSlug,
          organizationId: orgId,
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        },
        orgId,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success(`${providerName} OAuth credentials saved successfully!`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Set Up {providerName} Integration</DialogTitle>
          <DialogDescription>
            Configure your own OAuth application to connect {providerName} with your organization.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && setupInfo && step === 'info' && (
          <div className="space-y-4">
            {/* Setup Instructions */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Setup Instructions</h4>
              <div className="p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                {setupInfo.setupInstructions}
              </div>
            </div>

            {/* Callback URL */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Callback URL (Redirect URI)</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 rounded bg-muted text-xs break-all">
                  {setupInfo.callbackUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(setupInfo.callbackUrl, 'Callback URL')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Required Scopes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Required Scopes</Label>
              <div className="flex flex-wrap gap-1.5">
                {setupInfo.requiredScopes.map((scope) => (
                  <code key={scope} className="px-2 py-0.5 rounded bg-muted text-xs">
                    {scope}
                  </code>
                ))}
              </div>
            </div>

            {/* Create App Link */}
            {setupInfo.createAppUrl && (
              <a
                href={setupInfo.createAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open {providerName} Developer Console
              </a>
            )}
          </div>
        )}

        {!loading && setupInfo && step === 'credentials' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter your OAuth Client ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Enter your OAuth Client Secret"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your credentials are encrypted and stored securely. They are only used to authenticate
              with {providerName} on your behalf.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'info' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep('credentials')} disabled={!setupInfo}>
                I've Created My App
              </Button>
            </>
          )}
          {step === 'credentials' && (
            <>
              <Button variant="outline" onClick={() => setStep('info')}>
                Back
              </Button>
              <Button onClick={handleSaveCredentials} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save & Connect'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
