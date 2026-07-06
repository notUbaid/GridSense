import React from 'react';
import { LayoutDashboard, Users, UsersRound, Settings, Activity } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '#', active: false },
    { icon: Users, label: 'Generate Leads', href: '#', active: false },
    { icon: UsersRound, label: 'Manage Leads', href: '/', active: true },
    { icon: Settings, label: 'Settings', href: '#', active: false },
  ];

  return (
    <aside className="w-64 border-r border-border/40 bg-card/30 backdrop-blur-xl h-full flex flex-col fixed left-0 top-0 z-40 hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <span className="font-semibold text-lg tracking-tight">GrowEasy</span>
        </div>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto space-y-1 mt-4">
        <div className="text-xs font-medium text-muted-foreground mb-4 px-2 uppercase tracking-wider">
          Main Menu
        </div>
        
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link 
              key={index} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                item.active 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className={cn("w-4 h-4", item.active ? "text-primary" : "opacity-70")} />
              {item.label}
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-border/40">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
            US
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">User Session</span>
            <span className="text-xs text-muted-foreground mt-1">user@groweasy.ai</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
