import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Lock, Shield, Settings, Sparkles } from 'lucide-react';
import { cn } from '../utils/cn';

const navGroups = [
  {
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Documents',
    icon: FilePlus,
    items: [
      { name: 'Upload', path: '/workspace' },
      { name: 'Processing Queue', path: '/queue' },
    ]
  },
  {
    items: [
      { name: 'Secure Vault', path: '/vault', icon: Lock },
      { name: 'AI Investigation', path: '/investigate', icon: Sparkles },
    ]
  },
  {
    title: 'Security & Operations',
    icon: Shield,
    items: [
      { name: 'Compliance Center', path: '/compliance' },
      { name: 'Analytics Hub', path: '/analytics' },
    ]
  },
  {
    items: [
      { name: 'System Settings', path: '/settings', icon: Settings },
    ]
  }
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-border bg-card text-card-foreground hidden md:flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Shield className="w-6 h-6 text-[#1E3A8A] mr-2" />
        <span className="font-bold text-lg tracking-tight">PrivacyShield</span>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-6 overflow-y-auto">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {group.title && (
              <div className="flex items-center px-3 py-2 text-sm font-semibold text-foreground mb-1 mt-2">
                {group.icon && <group.icon className="w-5 h-5 mr-3 text-muted-foreground" />}
                {group.title}
              </div>
            )}
            
            <div className={cn("space-y-1", group.title && "ml-8")}>
              {group.items.map((item) => {
                const Icon = (item as any).icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        isActive
                          ? "bg-[#1E3A8A] text-white"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        !group.title && "py-2.5" 
                      )
                    }
                  >
                    {Icon && <Icon className="w-5 h-5 mr-3 flex-shrink-0" />}
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      
      <div className="p-4 border-t border-border mt-auto">
        <div className="text-xs text-muted-foreground px-2">
          <p>PrivacyShield Enterprise</p>
          <p>v2.5.0</p>
        </div>
      </div>
    </aside>
  );
}
