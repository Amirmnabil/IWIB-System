'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useRouter } from 'next/navigation';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  priority: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { internalUserId } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!internalUserId) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', internalUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    };

    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${internalUserId}`,
        },
        (payload) => {
          const newNotification = payload.new as AppNotification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${internalUserId}`,
        },
        (payload) => {
          const updatedNotification = payload.new as AppNotification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
          if (updatedNotification.is_read && payload.old.is_read === false) {
             setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [internalUserId]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
    
    // Navigate based on entity type
    if (notification.entity_type && notification.entity_id) {
       switch(notification.entity_type) {
          case 'companies':
             router.push(`/companies/${notification.entity_id}`);
             break;
          case 'policies':
             router.push(`/policies/${notification.entity_id}`);
             break;
       }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive/100';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-primary/100';
      case 'low': return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive/100 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 rounded-2xl shadow-2xl border-none overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-background border-b border-border">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-foreground">Notifications</h4>
            {unreadCount > 0 && (
               <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                 {unreadCount} new
               </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 px-2 text-xs font-semibold text-primary hover:text-indigo-700 hover:bg-primary/10">
              <Check className="w-4 h-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px] bg-card">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground space-y-3">
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center">
                 <Bell className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-semibold">All caught up!</p>
              <p className="text-xs">No new notifications right now.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-50">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "p-4 cursor-pointer hover:bg-background transition-colors flex gap-3 relative",
                    !notification.is_read ? "bg-primary/10/30" : "opacity-70"
                  )}
                >
                  {!notification.is_read && (
                     <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/100"></span>
                  )}
                  <div className="flex-none pt-1 pl-2">
                    <span className={cn("flex w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white", getPriorityColor(notification.priority))} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                       <p className={cn("text-sm leading-tight", !notification.is_read ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                         {notification.title}
                       </p>
                       <span className="text-[10px] text-slate-400 whitespace-nowrap">
                         {new Date(notification.created_at).toLocaleDateString()}
                       </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
