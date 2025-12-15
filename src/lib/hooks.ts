
"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { AppUser, Channel, Message, Transaction } from './types';
import { CHANNELS, MESSAGES, TRANSACTIONS, MOCK_USERS } from './mock-data';
import { useToast } from "@/hooks/use-toast";

export interface AppContextType {
  // Auth
  user: AppUser | null;
  loading: boolean;
  register: (email: string, pass: string, username: string) => Promise<any>;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;

  // Wallet
  walletBalance: number;
  transactions: Transaction[];
  addFunds: (amount: number) => void;
  unlockMessage: (messageId: string, price: number) => Promise<boolean>;

  // Chat
  channels: Channel[];
  messages: Message[];
  sendMessage: (channelId: string, content: string, isLocked: boolean, price: number, imageData?: string | null) => void;
  isMessageUnlocked: (messageId: string) => boolean;
  typingUsers: { [channelId: string]: string[] };
  connectToChannel: (channelId: string) => void;
  loadUserChat: (peerId: string) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};

export const useAuth = () => {
  const { user, loading, register, login, logout } = useAppContext();
  return { user, loading, register, login, logout };
};

export const useWallet = () => {
  const { walletBalance, transactions, addFunds, unlockMessage } = useAppContext();
  return { walletBalance, transactions, addFunds, unlockMessage };
};

export const useChat = () => {
  const { channels, messages, sendMessage, isMessageUnlocked, typingUsers, connectToChannel, loadUserChat } = useAppContext();
  return { channels, messages, sendMessage, isMessageUnlocked, typingUsers, connectToChannel, loadUserChat };
};

export const useAppProvider = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // --- Wallet State ---
  const [walletBalance, setWalletBalance] = useState(100);
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS);

  // --- Chat State ---
  const [channels, setChannels] = useState<Channel[]>(CHANNELS);
  const [messages, setMessages] = useState<Message[]>(MESSAGES);
  const [unlockedMessages, setUnlockedMessages] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<{ [channelId: string]: string[] }>({});
  const [connectedChannelId, setConnectedChannelId] = useState<string | null>(null);
  const chatWSRef = useRef<WebSocket | null>(null);


  function toAppUser(apiUser: { id: string; email?: string; username?: string; role?: string; balance?: number; status?: string }): AppUser {
    return {
      uid: apiUser.id,
      email: apiUser.email || '',
      username: apiUser.username || '',
      role: (apiUser.role as any) || 'user',
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      providerId: 'custom',
      tenantId: null,
      delete: async () => { },
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as any),
      reload: async () => { },
      toJSON: () => ({}),
      photoURL: null,
      displayName: apiUser.username || apiUser.email || null,
      phoneNumber: null,
      refreshToken: '',
    } as unknown as AppUser;
  }

  // --- Auth Effects ---
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const { apiClient } = await import("./api/useApi");
        const baseUrl = (await import("./api/useApi")).API_BASE_URL || "";
        const endpoint = `${baseUrl}/user/checkkauth`;
        const res = await apiClient<any>(endpoint, { method: "POST" });
        const apiUser = (res as any)?.data;
        if (!cancelled && apiUser) {
          setUser(toAppUser(apiUser));
        }
      } catch (e) {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Auth Methods ---
  const login = useCallback(async (email: string, pass: string) => {
    setLoading(true);
    try {
      const { apiClient } = await import("./api/useApi");
      const baseUrl = (await import("./api/useApi")).API_BASE_URL || "";
      const endpoint = `${baseUrl}/user/login`;
      const res = await apiClient<any>(endpoint, {
        method: "POST",
        body: JSON.stringify({ email, password: pass }),
      });
      const apiUser = (res as any)?.data || {};
      setUser(toAppUser(apiUser));
      toast({ title: "Login successful!", description: `Welcome back${apiUser.username ? ", " + apiUser.username : "."}` });
      return { user: apiUser };
    } finally {
      setLoading(false);
    }
  }, [toast, walletBalance]);

  const register = useCallback(async (email: string, pass: string, username: string) => {
    setLoading(true);
    try {
      const fakeUser = { id: 'user_' + Date.now(), email, username, balance: walletBalance };
      setUser(toAppUser(fakeUser));
      toast({ title: "Registration successful!", description: `Welcome, ${fakeUser.username || fakeUser.email}.` });
      return { user: fakeUser };
    } finally {
      setLoading(false);
    }
  }, [toast, walletBalance]);

  const logout = useCallback(async () => {
    try {
      const { apiClient } = await import("./api/useApi");
      const baseUrl = (await import("./api/useApi")).API_BASE_URL || "";
      const endpoint = `${baseUrl}/user/logout`;
      const payload: any = {};
      if (user?.uid) {
        payload.id = user.uid;
      }
      if (user?.username) {
        payload.username = user.username;
      } else if (user?.email) {
        payload.email = user.email;
      }
      await apiClient<any>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } finally {
      setUser(null);
      setWalletBalance(0);
      toast({ title: "Logged out." });
    }
  }, [toast, user]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let mounted = true;
    const connect = async () => {
      if (!user) return;
      try {
        const baseUrl = (await import("./api/useApi")).API_BASE_URL || "http://10.50.180.81:42007";
        const wsUrl = (baseUrl.startsWith("http") ? baseUrl.replace(/^http/, "ws") : baseUrl) + "/ws/chat";
        ws = new WebSocket(wsUrl);
        chatWSRef.current = ws;
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg && msg.type === "chat" && msg.data) {
              const d = msg.data;
              const incoming: Message = {
                id: d.id || `msg_${Date.now()}`,
                channelId: d.receiverId === user.uid ? d.senderId : d.receiverId,
                author: { uid: d.senderId, name: d.senderId === user.uid ? (user.username || user.email || "You") : "" },
                content: d.content || "",
                timestamp: d.timestamp || Date.now(),
                isLocked: !!d.isLocked,
                price: d.price || 0,
                imageData: d.imageData || null,
                unlockedBy: [],
              };
              setMessages(prev => [...prev, incoming]);
            }
          } catch {}
        };
        ws.onclose = () => {
          if (chatWSRef.current === ws) {
            chatWSRef.current = null;
          }
        };
      } catch {}
    };
    connect();
    return () => {
      mounted = false;
      if (ws) {
        try { ws.close(); } catch {}
      }
      chatWSRef.current = null;
    };
  }, [user]);


  // --- Wallet Methods ---
  const addFunds = useCallback((amount: number) => {
    if (amount > 0) {
      setWalletBalance(prev => prev + amount);
      const newTransaction: Transaction = {
        id: `txn_${Date.now()}`,
        type: 'deposit',
        amount: amount,
        description: 'Manual deposit',
        timestamp: Date.now(),
      };
      setTransactions(prev => [newTransaction, ...prev]);
      toast({ title: "Funds added", description: `$${amount.toFixed(2)} added to your wallet.` });
    }
  }, [toast]);

  const unlockMessage = useCallback(async (messageId: string, price: number) => {
    if (!user) {
      toast({ variant: "destructive", title: "Unlock failed", description: "You must be logged in." });
      return false;
    }
    if (walletBalance < price) {
      toast({ variant: "destructive", title: "Insufficient funds", description: "Please add more funds to your wallet." });
      return false;
    }
    setWalletBalance(prev => prev - price);
    setUnlockedMessages(prev => new Set(prev).add(messageId));
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, unlockedBy: [...msg.unlockedBy, user?.uid ?? 'unknown'] }
        : msg
    ));
    const newTransaction: Transaction = {
      id: `txn_${Date.now()}`,
      type: 'purchase',
      amount: -price,
      description: 'Unlocked a message',
      timestamp: Date.now(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
    toast({ title: "Message unlocked!", description: `You can now view the message.` });
    return true;
  }, [user, walletBalance, toast]);

  // --- Chat Methods ---
  const isMessageUnlocked = useCallback((messageId: string) => {
    return unlockedMessages.has(messageId);
  }, [unlockedMessages]);

  const loadUserChat = useCallback(async (peerId: string) => {
    if (!user) return;
    try {
      const { apiClient } = await import("./api/useApi");
      const baseUrl = (await import("./api/useApi")).API_BASE_URL || "";
      const endpoint = `${baseUrl}/user/chats?peerId=${encodeURIComponent(peerId)}`;
      const res = await apiClient<any>(endpoint, { method: "GET" });
      const items = (res as any)?.data || [];
      const mapped: Message[] = items.map((m: any) => ({
        id: m.id,
        channelId: m.senderId === user.uid ? m.receiverId : m.senderId,
        author: {
          uid: m.senderId,
          name: m.senderId === user.uid ? (user.username || user.email || "You") : "",
        },
        content: m.content || "",
        timestamp: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
        isLocked: false,
        price: 0,
        imageData: m.imageData || null,
        unlockedBy: [],
      }));
      setMessages(prev => {
        const others = prev.filter(msg => mapped.every(mm => mm.id !== msg.id));
        return [...others, ...mapped];
      });
    } catch {}
  }, [user]);

  const sendMessage = useCallback((channelId: string, content: string, isLocked: boolean, price: number, imageData: string | null = null) => {
    if (!user) return;
    const payloadContent = content.trim().length ? content.trim() : (imageData ? ' ' : '');
    const isKnownChannel = channels.some(c => c.id === channelId);

    if (isKnownChannel) {
      const optimistic: Message = {
        id: `msg_${Date.now()}`,
        channelId,
        author: { uid: user.uid, name: user.username || user.email || 'You' },
        content: payloadContent,
        timestamp: Date.now(),
        isLocked,
        price: isLocked ? price : 0,
        imageData: imageData || null,
        unlockedBy: [],
      };
      setMessages(prev => [...prev, optimistic]);
      return;
    }

    if (chatWSRef.current && chatWSRef.current.readyState === WebSocket.OPEN) {
      try {
        chatWSRef.current.send(JSON.stringify({
          type: "send",
          to: channelId,
          content: payloadContent,
          imageData,
          isLocked,
          price,
        }));
      } catch {}
    }
  }, [user, channels]);

  // --- Real-time Simulation ---

const connectToChannel = useCallback((channelId: string) => {
  setConnectedChannelId(channelId);
  const initialForChannel = MESSAGES.filter(m => m.channelId === channelId);
  setMessages(prev => {
    const existingForChannel = prev.filter(m => m.channelId === channelId);
    if (existingForChannel.length) return prev;
    return [...prev, ...initialForChannel].sort((a, b) => a.timestamp - b.timestamp);
  });
}, []);
  return {
    user,
    loading,
    register,
    login,
    logout,
    walletBalance,
    transactions,
    addFunds,
    unlockMessage,
    channels,
    messages,
    sendMessage,
    isMessageUnlocked,
    typingUsers,
    connectToChannel,
    loadUserChat,
  };
}
