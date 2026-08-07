import { useEffect, useState } from 'react';
import { Lock, FileText, ShieldAlert, Eye, Search, ChevronDown, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { DocumentService, AnalysisService } from '../services/api';

export function Vault() {
  const [vaultData, setVaultData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchVaultItems = async () => {
    try {
      const response = await DocumentService.getVaultItems();
      setVaultData(response.data || []);
    } catch (error) {
      console.error("Failed to fetch vault items", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultItems();
  }, []);

  const handleDownload = (id: string) => {
    window.open(AnalysisService.getDownloadUrl(id), '_blank');
  };

  const totalFiles = vaultData.length;
  const totalPiiRedacted = vaultData.reduce((acc, item) => acc + (item.pii || 0), 0);
  const totalStorageMb = vaultData.reduce((acc, item) => {
    const szStr = String(item.size || '0');
    const val = parseFloat(szStr) || 0;
    return acc + val;
  }, 0).toFixed(2);

  const filteredVault = vaultData.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Secure Vault</h1>
        <p className="text-muted-foreground mt-1">Encrypted storage for redacted documents</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-800">
              <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{totalFiles}</h3>
            <p className="text-sm text-muted-foreground mt-1">Vault Files</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-800">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{totalStorageMb} MB</h3>
            <p className="text-sm text-muted-foreground mt-1">Storage Used</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4 border border-amber-100 dark:border-amber-800">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{totalPiiRedacted}</h3>
            <p className="text-sm text-muted-foreground mt-1">PII Elements Redacted</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-800">
              <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">AES-256</h3>
            <p className="text-sm text-muted-foreground mt-1">Encryption</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm rounded-xl">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              className="pl-9 h-10" 
              placeholder="Search vault files..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="w-full sm:w-auto h-10 justify-between min-w-[120px]">
            All Items
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">File Name</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium text-center">PII Redacted</th>
                <th className="px-6 py-4 font-medium">Access Level</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading vault data...
                  </td>
                </tr>
              ) : filteredVault.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No items found in secure vault. Upload documents in Workspace to redact PII and save them here.
                  </td>
                </tr>
              ) : (
                filteredVault.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <Lock className="w-5 h-5 text-[#0F766E] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.size}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                        {item.category || 'PDF Document'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-foreground">
                      {item.pii || 0}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.access || 'Restricted'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.date || 'Today'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleDownload(item.id)}
                          title="Download Redacted"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
