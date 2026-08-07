import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const userInitial = (user?.full_name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <header className="h-16 border-b border-border bg-card text-card-foreground flex items-center justify-between px-6 z-20 sticky top-0 bg-slate-950/20 backdrop-blur-md">
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon" className="md:hidden mr-2">
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/settings')}
          title={`Logged in as: ${user?.full_name || user?.email || 'User'} — Click to open System Settings`}
          className="w-9 h-9 rounded-full bg-[#0F766E] hover:bg-[#0D6E66] active:scale-95 transition-all flex items-center justify-center text-white font-semibold ml-2 shadow-sm hover:ring-2 hover:ring-cyan-500/50 cursor-pointer"
        >
          {userInitial}
        </button>
      </div>
    </header>
  );
}
