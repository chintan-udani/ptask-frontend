"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Logo } from '../logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


export function ChannelSidebar() {

  const { user, logout } = useAuth();
  const router = useRouter();
  const people = [
    { id: 'user1', name: 'Alice' },
    { id: 'user2', name: 'Bob' },
    { id: 'user3', name: 'Charlie' },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="h-16 border-b px-4 flex items-center">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 p-2">
        <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">People</p>
        {people.map((person) => (
          <Button
            key={person.id}
            variant="ghost"
            className="w-full justify-start"
          >
            <UserIcon className="mr-2 h-4 w-4" />
            {person.name}
          </Button>
        ))}
      </nav>
      <div className="mt-auto border-t p-2">
        <div className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50">
           <div className="flex items-center gap-2">
             <Avatar className="h-8 w-8">
                <AvatarFallback>
                    <UserIcon className="h-4 w-4" />
                </AvatarFallback>
             </Avatar>
             <span className="text-sm font-medium">{user?.username || user?.email}</span>
           </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
