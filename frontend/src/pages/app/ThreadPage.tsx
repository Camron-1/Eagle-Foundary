import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MessageThread, Message, ThreadCryptoContext } from '@/lib/api/types';
import { useAuth } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/cn';
import { ensureDeviceKeyMaterial } from '@/lib/security/keyStore';
import { decryptThreadMessage, encryptThreadMessage } from '@/lib/security/e2ee';
import { toast } from '@/components/ui/toast';

function getThreadContext(thread: MessageThread): string {
  if (thread.application) return `Application: ${thread.application.opportunity?.title ?? 'Opportunity'}`;
  if (thread.joinRequest) return `Join Request: ${thread.joinRequest.startup?.name ?? 'Startup'}`;
  return 'Message Thread';
}

export default function ThreadPage(): JSX.Element {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState('');
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});
  const [myFingerprint, setMyFingerprint] = useState<string | null>(null);

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ['messages', 'thread', threadId],
    queryFn: async () => {
      const res = await api.get<{ data?: MessageThread } | MessageThread>(endpoints.messages.thread(threadId!));
      const payload = res.data;
      return (payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload) as MessageThread;
    },
    enabled: !!threadId,
  });

  const { data: cryptoContext } = useQuery({
    queryKey: ['messages', 'thread', threadId, 'crypto-context'],
    queryFn: async () => {
      const res = await api.get<{ data?: ThreadCryptoContext } | ThreadCryptoContext>(
        endpoints.messages.threadCryptoContext(threadId!)
      );
      const payload = res.data;
      return (payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload) as ThreadCryptoContext;
    },
    enabled: !!threadId,
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', 'thread', threadId, 'messages'],
    queryFn: async () => {
      const res = await api.get<{ data?: Message[] } | Message[]>(
        endpoints.messages.threadMessages(threadId!)
      );
      const body = res.data;
      const list = (body && typeof body === 'object' && 'data' in body ? body.data : body) ?? [];
      return Array.isArray(list) ? list : [];
    },
    enabled: !!threadId,
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    ensureDeviceKeyMaterial()
      .then(async (material) => {
        if (!mounted) return;
        setMyFingerprint(material.fingerprint);
        try {
          await api.get(endpoints.messages.myKey);
        } catch {
          await api.post(endpoints.messages.registerKey, {
            publicKeyPem: material.publicKeyPem,
            fingerprint: material.fingerprint,
            algorithm: material.algorithm,
          });
        }
      })
      .catch(() => {
        if (!mounted) return;
        toast.error('Unable to initialize secure messaging on this device.');
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const messages = messagesData ?? [];

  useEffect(() => {
    if (!cryptoContext || !currentUserId || messages.length === 0) {
      return;
    }

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        messages.map(async (msg) => {
          const value = await decryptThreadMessage(msg, cryptoContext, currentUserId);
          return [msg.id, value] as const;
        })
      );
      if (!cancelled) {
        setDecryptedMap(Object.fromEntries(entries));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messages, cryptoContext, currentUserId]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const trimmed = content.trim();
      if (!trimmed) return;

      if (!threadId) {
        throw new Error('Missing thread');
      }

      if (cryptoContext?.encryptionRequired && !cryptoContext?.isLegacyPlaintextThread) {
        if (!currentUserId || !myFingerprint) {
          throw new Error('Secure messaging keys are not ready yet');
        }

        const encrypted = await encryptThreadMessage(trimmed, cryptoContext, currentUserId, myFingerprint);
        await api.post(endpoints.messages.sendMessage(threadId), encrypted);
      } else {
        await api.post(endpoints.messages.sendMessage(threadId), { content: trimmed });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'thread', threadId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'thread', threadId, 'crypto-context'] });
      setContent('');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!threadId) navigate('/messages');
  }, [threadId, navigate]);

  const encryptionBadge = useMemo(() => {
    if (!cryptoContext) return null;
    if (cryptoContext.isLegacyPlaintextThread) return 'Legacy thread';
    return cryptoContext.encryptionRequired ? 'End-to-end encrypted' : 'Standard thread';
  }, [cryptoContext]);

  if (!threadId) return <></>;

  if (threadLoading || !thread) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-white" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <header className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/messages')}
          className="text-sm text-fg-muted hover:text-fg"
        >
          ← Back
        </button>
        <div className="space-y-1">
          <h1 className="ef-heading-gradient text-2xl font-semibold leading-tight md:text-3xl">
            {getThreadContext(thread)}
          </h1>
          {encryptionBadge && <p className="text-xs uppercase tracking-[0.12em] text-fg-subtle">{encryptionBadge}</p>}
        </div>
      </header>

      <div className="flex flex-1 flex-col rounded-2xl border border-border-subtle bg-surface">
        <div className="flex max-h-[400px] min-h-[200px] flex-1 flex-col overflow-y-auto p-4 space-y-4">
          {messagesLoading ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong border-t-white" />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-subtle">No messages yet. Start the conversation.</p>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.senderId === currentUserId;
              const renderedText = decryptedMap[msg.id] ?? (msg.content ?? '...');
              return (
                <div
                  key={msg.id}
                  className={isOwn ? 'flex justify-end' : 'flex justify-start'}
                >
                  <div
                    className={cn(
                      'flex max-w-[80%] gap-2',
                      isOwn && 'flex-row-reverse',
                    )}
                  >
                    <Avatar
                      name={isOwn ? 'You' : 'User'}
                      size="sm"
                      className="shrink-0"
                    />
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2',
                        isOwn
                          ? 'bg-surface-tint-strong text-fg'
                          : 'bg-surface-tint text-fg',
                      )}
                    >
                      <p className="text-sm">{renderedText}</p>
                      <p className="mt-1 text-xs text-fg-subtle">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border-subtle p-4">
          <div className="flex gap-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a message..."
              className="min-h-[44px] flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMutation.mutate();
                }
              }}
            />
            <Button
              variant="primary"
              withBorderEffect={false}
              onClick={() => sendMutation.mutate()}
              disabled={!content.trim() || sendMutation.isPending}
              className="self-end"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
