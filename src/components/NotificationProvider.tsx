
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Notification } from '@/types/notifications';

interface NotificationContextType {
  unreadCount: number;
  notifications: Notification[];
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      // Get name from employees table based on email
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('name')
        .eq('email', user.email)
        .single();
        
      if (employeeError) {
        console.error("Error fetching employee data:", employeeError);
        return;
      }
      
      if (!employeeData) {
        console.error("Employee not found for email:", user.email);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient', user.email)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // Check if related items (tasks, etc.) still exist
      const enhancedNotifications = await Promise.all(
        (data || []).map(async (notification) => {
          let relatedItemExists = true;
          
          // Only check existence for notifications with related_id
          if (notification.related_id && ['task_assignment', 'task_update', 'mention'].includes(notification.type)) {
            const { data: relatedData, error: relatedError } = await supabase
              .from('tasks')
              .select('id')
              .eq('id', notification.related_id)
              .maybeSingle();
              
            relatedItemExists = !relatedError && relatedData !== null;
          }
          
          return {
            ...notification,
            relatedItemExists
          } as Notification;
        })
      );
      
      setNotifications(enhancedNotifications);
      const unread = enhancedNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to update notification",
        variant: "destructive"
      });
    }
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      if (unreadIds.length === 0) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);
        
      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      setUnreadCount(0);
      
      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to update notifications",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Set up subscription for real-time updates
      const notificationSubscription = supabase
        .channel('notifications-channel')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient=eq.${user.email}` }, 
            () => {
              fetchNotifications();
              // Show toast notification
              toast({
                title: "New Notification",
                description: "You have received a new notification",
              });
            })
        .subscribe();
      
      return () => {
        supabase.removeChannel(notificationSubscription);
      };
    }
  }, [user, toast]);

  const value = {
    unreadCount,
    notifications,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
