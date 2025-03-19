
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications } from "@/components/NotificationProvider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen?: boolean;
}

const DashboardHeader = ({ toggleSidebar, isSidebarOpen }: DashboardHeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { unreadCount, notifications, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(true);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    navigate("/login");
  };

  const getTimeAgo = (timestamp: string) => {
    const notificationDate = new Date(timestamp);
    const now = new Date();
    const differenceInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);
    
    if (differenceInSeconds < 60) return 'Just now';
    if (differenceInSeconds < 3600) return `${Math.floor(differenceInSeconds / 60)}m`;
    if (differenceInSeconds < 86400) return `${Math.floor(differenceInSeconds / 3600)}h`;
    if (differenceInSeconds < 172800) return 'Yesterday';
    
    return format(notificationDate, 'MMM d');
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // Check if the related item exists before navigating
    if (notification.relatedItemExists === false) {
      // Show toast or handle deleted reference
      navigate('/notifications', { 
        state: { 
          showDeletedResourceMessage: true,
          notificationType: notification.type
        }
      });
      return;
    }
    
    // Route based on notification type with correct paths
    if (notification.type === 'task_assignment') {
      navigate(`/tasks/view/${notification.related_id}`);
    } else if (notification.type === 'task_update') {
      navigate(`/tasks/view/${notification.related_id}`);
    } else if (notification.type === 'mention') {
      navigate(`/tasks/view/${notification.related_id}`);
    } else {
      navigate('/notifications');
    }
  };

  const recentNotifications = notifications.slice(0, 5);
  const displayNotifications = showAllNotifications 
    ? recentNotifications
    : recentNotifications.filter(n => !n.read);

  return (
    <header className="bg-white border-b sticky top-0 z-30">
      <div className="flex items-center h-16 px-4">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        <div className="ml-auto flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex justify-between items-center p-3 border-b">
                <h3 className="font-semibold">Notifications</h3>
                <div className="flex space-x-2">
                  <button 
                    className={cn(
                      "text-xs px-3 py-1 rounded-full", 
                      showAllNotifications 
                        ? "bg-blue-100 text-blue-600" 
                        : "bg-gray-100 text-gray-600"
                    )}
                    onClick={() => setShowAllNotifications(true)}
                  >
                    All
                  </button>
                  <button 
                    className={cn(
                      "text-xs px-3 py-1 rounded-full", 
                      !showAllNotifications 
                        ? "bg-blue-100 text-blue-600" 
                        : "bg-gray-100 text-gray-600"
                    )}
                    onClick={() => setShowAllNotifications(false)}
                  >
                    Unread
                  </button>
                </div>
              </div>
              
              {unreadCount > 0 && (
                <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
                  <div className="text-sm">
                    You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Mark all as read
                  </Button>
                </div>
              )}
              
              <div className="max-h-96 overflow-y-auto">
                {displayNotifications.length > 0 ? (
                  <div>
                    <div className="p-2 text-xs font-medium text-gray-500">New</div>
                    {displayNotifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={cn(
                          "p-3 border-b cursor-pointer hover:bg-gray-50 flex items-start",
                          notification.relatedItemExists === false && "opacity-80",
                          !notification.read && "bg-blue-50"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex-1">
                          <p className="text-sm mb-1">{notification.title}</p>
                          <p className="text-xs text-gray-500">{notification.content}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {getTimeAgo(notification.created_at)}
                          </p>
                          {notification.relatedItemExists === false && (
                            <p className="text-xs text-amber-500 mt-1 italic">
                              Resource no longer available
                            </p>
                          )}
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No notifications
                  </div>
                )}
              </div>
              
              <div className="p-2 text-center border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/notifications')}
                  className="text-sm text-blue-600 hover:text-blue-700 w-full"
                >
                  See all
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-2">
                {user?.email ? user.email.split('@')[0] : 'Account'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? "Signing out..." : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
