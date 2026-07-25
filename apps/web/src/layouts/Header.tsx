import { useState } from 'react';
import { Menu, Moon, Sun, Bell, ChevronDown, Building } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [activeOrg, setActiveOrg] = useState('Enterprise Workspace A');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleOrgSwitch = (orgName: string) => {
    setActiveOrg(orgName);
    setDropdownOpen(false);
    toast.success(`Context switched to workspace: ${orgName}`);
  };

  return (
    <header className="h-16 border-b border-border bg-card text-card-foreground flex items-center justify-between px-6 z-20 sticky top-0 bg-slate-950/20 backdrop-blur-md">
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon" className="md:hidden mr-2">
          <Menu className="w-5 h-5" />
        </Button>

        {/* Workspace Switcher */}
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-900 transition-colors text-xs text-slate-300 font-semibold"
          >
            <Building className="w-3.5 h-3.5 text-cyan-400" />
            <span>{activeOrg}</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>
          
          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-56 rounded-lg border border-slate-800 bg-slate-950 shadow-2xl p-1 z-50">
              <button 
                onClick={() => handleOrgSwitch('Enterprise Workspace A')}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-900 hover:text-white rounded transition-colors"
              >
                Enterprise Workspace A
              </button>
              <button 
                onClick={() => handleOrgSwitch('Compliance Testing Tenant B')}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-900 hover:text-white rounded transition-colors"
              >
                Compliance Testing Tenant B
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>

        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-destructive rounded-full border-2 border-card" />
        </Button>
        
        <div 
          onClick={logout}
          title="Click to Logout"
          className="w-9 h-9 rounded-full bg-[#0F766E] flex items-center justify-center text-white font-semibold ml-2 cursor-pointer shadow-sm hover:opacity-80 transition-opacity"
        >
          A
        </div>
      </div>
    </header>
  );
}
