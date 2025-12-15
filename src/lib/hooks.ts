
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const { channels, messages, sendMessage, isMessageUnlocked, typingUsers, connectToChannel } = useAppContext();
  return { channels, messages, sendMessage, isMessageUnlocked, typingUsers, connectToChannel };
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
    setLoading(false);
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
    setUser(null);
    setWalletBalance(0);
    toast({ title: "Logged out." });
  }, [toast]);


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

  const sendMessage = useCallback((channelId: string, content: string, isLocked: boolean, price: number, imageData: string | null = null) => {
    if (!user) return;
    const payloadContent = content.trim().length ? content.trim() : (imageData ? ' ' : '');
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
  }, [user]);

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
  };
}
