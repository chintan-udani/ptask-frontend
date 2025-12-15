"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Logo } from '../logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { API_BASE_URL, apiClient } from '@/lib/api/useApi';


export function ChannelSidebar() {

  const { user, logout } = useAuth();
  const router = useRouter();
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; onlineStatus?: string }[]>([]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    const base = API_BASE_URL || "http://10.50.180.81:42007";
    const url = (base.startsWith("http") ? base.replace(/^http/, "ws") : base) + "/ws/online-users";
    try {
      ws = new WebSocket(url);
    } catch {}
    if (ws) {
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg && msg.type === "onlineUsers" && Array.isArray(msg.data)) {
            const mapped = msg.data.map((u: any) => ({ id: u.id, name: u.username || u.email || "" }));
            setPeople(mapped);
          }
        } catch {}
      };
    }
    return () => {
      if (ws) {
        try { ws.close(); } catch {}
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const base = API_BASE_URL || "http://10.50.180.81:42007";
        const res = await apiClient<any>(`${base}/user/getuserdata`, { method: "GET" });
        const list = (res as any)?.data || [];
        if (!cancelled) {
          const mapped = list.map((u: any) => ({
            id: String(u._id),
            name: u.username || u.email || u.name || "",
            onlineStatus: u.onlineStatus,
          }));
          setAllUsers(mapped);
        }
      } catch {}
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const onlineIds = new Set(people.map(p => p.id));
  const displayed = (allUsers.length ? allUsers : people).filter(p => p.id !== (user?.uid || ""));

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="h-16 border-b px-4 flex items-center">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 p-2">
        <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">People</p>
        {displayed.map((person) => {
          const isOnline = onlineIds.has(person.id);
          return (
          <Button
            key={person.id}
            variant="ghost"
            className={`w-full justify-start ${!isOnline ? 'opacity-50' : ''}`}
            onClick={() => router.push(`/chat?user=${person.id}`)}
          >
            <UserIcon className="mr-2 h-4 w-4" />
            {person.name}
          </Button>
        );
        })}
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
