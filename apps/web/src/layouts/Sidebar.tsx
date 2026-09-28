import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FilePlus, 
  Lock, 
  Shield, 
  Settings, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Upload,
  Clock,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
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
      { name: 'Upload', path: '/workspace', icon: Upload },
      { name: 'Processing Queue', path: '/queue', icon: Clock },
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
      { name: 'Compliance Center', path: '/compliance', icon: ShieldCheck },
      { name: 'Analytics Hub', path: '/analytics', icon: BarChart3 },
    ]
  },
  {
    items: [
      { name: 'System Settings', path: '/settings', icon: Settings },
    ]
  }
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "relative border-r border-border bg-card text-card-foreground hidden md:flex flex-col h-full transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border overflow-hidden">
        <div className="flex items-center min-w-0">
          <Shield className="w-6 h-6 text-[#1E3A8A] flex-shrink-0" />
          <span
            className={cn(
              "font-bold text-lg tracking-tight ml-2 whitespace-nowrap transition-all duration-300",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}
          >
            PrivacyShield
          </span>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            "flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            "transition-all duration-200 active:scale-90",
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-2 space-y-6 overflow-y-auto overflow-x-hidden">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {group.title && !collapsed && (
              <div className="flex items-center px-3 py-2 text-sm font-semibold text-foreground mb-1 mt-2 whitespace-nowrap">
                {group.icon && <group.icon className="w-5 h-5 mr-3 text-muted-foreground flex-shrink-0" />}
                <span className="transition-all duration-300">{group.title}</span>
              </div>
            )}

            {/* Collapsed group icon separator */}
            {group.title && collapsed && (
              <div className="flex justify-center py-2">
                {group.icon && <group.icon className="w-4 h-4 text-muted-foreground/50" />}
              </div>
            )}

            <div className={cn("space-y-1", group.title && !collapsed && "ml-8")}>
              {group.items.map((item) => {
                const Icon = (item as any).icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.name : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center text-sm font-medium rounded-lg transition-all duration-200",
                        collapsed
                          ? "justify-center px-2 py-2.5 mx-auto"
                          : "px-3 py-2",
                        isActive
                          ? "bg-[#1E3A8A] text-white"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        !group.title && "py-2.5"
                      )
                    }
                  >
                    {Icon && (
                      <Icon className={cn("w-5 h-5 flex-shrink-0", !collapsed && "mr-3")} />
                    )}
                    {!Icon && collapsed && (
                      <span className="w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {item.name.charAt(0)}
                      </span>
                    )}
                    <span
                      className={cn(
                        "whitespace-nowrap transition-all duration-300",
                        collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                      )}
                    >
                      {item.name}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border mt-auto overflow-hidden">
        <div
          className={cn(
            "text-xs text-muted-foreground px-2 whitespace-nowrap transition-all duration-300",
            collapsed ? "opacity-0" : "opacity-100"
          )}
        >
          <p>PrivacyShield Enterprise</p>
          <p>v2.5.0</p>
        </div>
      </div>
    </aside>
  );
}
