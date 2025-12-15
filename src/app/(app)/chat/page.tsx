"use client";

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChat } from '@/lib/hooks';
import { MessageList } from '@/app/components/chat/message-list';
import { MessageInput } from '@/app/components/chat/message-input';
 

export default function ChatPage() {
  const searchParams = useSearchParams();
  const { messages, typingUsers, loadUserChat } = useChat();

  const peerId = useMemo(() => {
    const userParam = searchParams.get('user');
    if (userParam) return userParam;
    const channelParam = searchParams.get('channel');
    if (channelParam) return channelParam;
    return null;
  }, [searchParams]);

  const filteredMessages = useMemo(
    () => (peerId ? messages.filter(msg => msg.channelId === peerId) : []),
    [messages, peerId]
  );
  
  const currentTypingUsers = peerId ? (typingUsers[peerId] || []) : [];

  useEffect(() => {
    if (!peerId) return;
    loadUserChat(peerId);
  }, [peerId, loadUserChat]);

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={filteredMessages} />
      {peerId && (
        <MessageInput channelId={peerId} typingUsers={currentTypingUsers} />
      )}
    </div>
  );
}
