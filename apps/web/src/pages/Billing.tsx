import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, ShieldAlert, Loader2, Sparkles, Send, Users, HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BillingService } from '../services/api';
import { toast } from 'sonner';

type BillingStatus = {
  organization_id: number;
  name: string;
  tier: string;
  status: string;
  seats_used: number;
  max_users: number;
  bytes_used: number;
  bytes_quota: number;
  stripe_subscription_id: string;
};

export function Billing() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchBillingStatus = async () => {
    setIsLoading(true);
    try {
      const response = await BillingService.getStatus();
      setStatus(response.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to retrieve billing metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingStatus();
  }, []);

  const handleCheckout = async (tier: string) => {
    try {
      const response = await BillingService.checkout(tier);
      toast.success(`Mock checkout initialized! URL: ${response.data.checkout_url}`);
      window.open(response.data.checkout_url, '_blank');
    } catch (err) {
      toast.error('Checkout creation failed.');
    }
  };

  const handleSimulateWebhook = async (tier: string) => {
    if (!status) return;
    setIsSimulating(true);
    try {
      await BillingService.triggerWebhook(
        status.organization_id, 
        tier, 
        'checkout.session.completed'
      );
      toast.success(`Stripe webhook triggered: checkout.session.completed event for ${tier.toUpperCase()}`);
      // Refresh status
      await fetchBillingStatus();
    } catch (err) {
      toast.error('Webhook simulation failed.');
    } finally {
      setIsSimulating(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (isLoading && !status) {
    return (
      <div className="flex h-60 items-center justify-center space-x-2">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        <span className="text-sm font-mono text-slate-400">Querying subscription limits...</span>
      </div>
    );
  }

  const usagePercent = status ? Math.min(100, (status.bytes_used / status.bytes_quota) * 100) : 0;
  const activeSeatsPercent = status ? Math.min(100, (status.seats_used / status.max_users) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Subscription Control</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Stripe Billing Dashboard</h1>
          <p className="text-slate-400 text-xs mt-0.5">Manage user seats, scan volume quotas, and subscription contract tiers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Plan & Quotas */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-950/40 backdrop-blur-md border border-slate-800">
            <CardHeader className="border-b border-slate-800 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-bold text-white">Active Subscription Plan</CardTitle>
                  <CardDescription className="text-xs text-slate-400">Current active constraints of your workspace.</CardDescription>
                </div>
                <span className="text-xs font-mono font-black uppercase bg-cyan-500 text-slate-950 px-3 py-1 rounded">
                  {status?.tier || 'FREE'} tier
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Seat Quota */}
                <div className="space-y-3 p-4 rounded-lg bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center space-x-2 text-cyan-400">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Active User Seats</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-white">{status?.seats_used}</span>
                    <span className="text-slate-500 text-sm"> / {status?.max_users} max seats</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 transition-all duration-500" 
                      style={{ width: `${activeSeatsPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Data Quota */}
                <div className="space-y-3 p-4 rounded-lg bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center space-x-2 text-teal-400">
                    <HardDrive className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Scan Volume Quota</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-white">{status ? formatBytes(status.bytes_used) : '0 B'}</span>
                    <span className="text-slate-500 text-sm"> / {status ? formatBytes(status.bytes_quota) : '50 MB'}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                    <div 
                      className="h-full bg-teal-500 transition-all duration-500" 
                      style={{ width: `${usagePercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Tiers Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <Card className="bg-slate-950/40 border border-slate-800/80 flex flex-col">
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">Free Tier</h3>
                  <p className="text-2xl font-black text-white mt-2">$0 <span className="text-xs font-normal text-slate-500">/ mo</span></p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">Basic scanner for personal documents.</p>
                  <ul className="text-[10px] text-slate-400 space-y-1.5 mt-4">
                    <li className="flex items-center"><CheckCircle2 className="w-3 h-3 text-cyan-400 mr-1.5 flex-shrink-0" /> Up to 3 team users</li>
                    <li className="flex items-center"><CheckCircle2 className="w-3 h-3 text-cyan-400 mr-1.5 flex-shrink-0" /> 50 MB scan volume</li>
                  </ul>
                </div>
                <Button disabled className="w-full bg-slate-900 border border-slate-800 text-slate-500">Current Plan</Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="bg-slate-950/40 border border-cyan-500/30 flex flex-col relative shadow-md shadow-cyan-950/20">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest bg-cyan-500 text-slate-950 px-2.5 py-0.5 rounded-full">
                Most Popular
              </span>
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-base font-bold text-cyan-400 uppercase tracking-wider">Pro Tier</h3>
                  <p className="text-2xl font-black text-white mt-2">$49 <span className="text-xs font-normal text-slate-500">/ mo</span></p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">For growing teams requiring regular scans.</p>
                  <ul className="text-[10px] text-slate-400 space-y-1.5 mt-4">
                    <li className="flex items-center"><CheckCircle2 className="w-3 h-3 text-cyan-400 mr-1.5 flex-shrink-0" /> Up to 10 team users</li>
                    <li className="flex items-center"><CheckCircle2 className="w-3 h-3 text-cyan-400 mr-1.5 flex-shrink-0" /> 5 GB included volume</li>
                    <li className="flex items-center"><CheckCircle2 className="w-3 h-3 text-cyan-400 mr-1.5 flex-shrink-0" /> $0.10 per additional GB</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => handleCheckout('pro')}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold"
                >
                  Upgrade Pro
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card className="bg-slate-950/40 border border-slate-800/80 flex flex-col">
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">Enterprise</h3>
                  <p className="text-2xl font-black text-white mt-2">$499 <span className="text-xs font-normal text-slate-500">/ mo</span></p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">Full cybersecurity compliance dashboard.</p>
                  <ul className="text-[10px] text-slate-400 space-y-1.5 mt-4">
                    <li className="flex items-center"><CheckCircle2 className="w-3 h-3 text-cyan-400 mr-1.5 flex-shrink-0" /> Up to 100 team users</li>
                    <li className="flex items-center"><CheckCircle2 className="w-3 h-3 text-cyan-400 mr-1.5 flex-shrink-0" /> 500 GB included volume</li>
                    <li className="flex items-center"><CheckCircle2 className="w-3 h-3 text-cyan-400 mr-1.5 flex-shrink-0" /> Dedicated RAG assistant</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => handleCheckout('enterprise')}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  Upgrade Enterprise
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Stripe Webhook Simulator */}
        <div className="space-y-6">
          <Card className="bg-slate-950/40 border border-cyan-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 text-white">
                <Send className="w-4 h-4 text-cyan-400" />
                <span>Stripe Event Simulator</span>
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-400">
                Trigger mock Stripe webhook events locally to test end-to-end subscription switches.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Clicking below simulates a Stripe checkout.session.completed callback reaching the FastAPI backend, provisioning quotas immediately.
              </p>
              
              <div className="space-y-2 pt-2">
                <Button 
                  disabled={isSimulating}
                  onClick={() => handleSimulateWebhook('pro')}
                  className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-cyan-400 font-bold text-xs"
                >
                  {isSimulating ? 'Sending Webhook...' : 'Simulate Pro Checkout Event'}
                </Button>

                <Button 
                  disabled={isSimulating}
                  onClick={() => handleSimulateWebhook('enterprise')}
                  className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-teal-400 font-bold text-xs"
                >
                  {isSimulating ? 'Sending Webhook...' : 'Simulate Enterprise Event'}
                </Button>
              </div>

              <div className="p-3 bg-slate-900/60 rounded border border-slate-800/80 space-y-1.5">
                <div className="flex items-center space-x-1 text-[10px] text-cyan-400 font-bold">
                  <span>MOCK WEBHOOK STATUS:</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 block">
                  POST /api/v1/billing/webhook - Listening on port 8000
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-950/40 border border-slate-800">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 text-white">
                <ShieldAlert className="w-4 h-4 text-slate-400" />
                <span>Seat Billing Policy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs text-slate-400 leading-relaxed space-y-2">
              <p>
                Each active member added to the team consumes one seat slot.
              </p>
              <p>
                Admin roles have granular permissions to scale seats or view monthly usage details.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
