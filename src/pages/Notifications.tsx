
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Check, MessageSquare, User, Clipboard, X, AlertTriangle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useNotifications } from "@/components/NotificationProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import DeletedUserInfo from "@/components/DeletedUserInfo";
import NotificationDeleteDialog from "@/components/NotificationDeleteDialog";

const Notifications = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  
  // Check if we're coming from a deleted resource notification
  const showDeletedResourceMessage = location.state?.showDeletedResourceMessage;
  const notificationType = location.state?.notificationType;

  useEffect(() => {
    refreshNotifications();
    
    // Show toast for deleted resource if necessary
    if (showDeletedResourceMessage) {
      let resourceType = "resource";
      if (notificationType === 'task_assignment' || notificationType === 'task_update') {
        resourceType = "task";
      } else if (notificationType === 'mention') {
        resourceType = "comment thread";
      }
      
      toast({
        title: "Resource Unavailable",
        description: `The ${resourceType} this notification refers to is no longer available.`,
        variant: "destructive"
      });
      
      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [refreshNotifications, showDeletedResourceMessage, notificationType, toast]);

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assignment':
        return <Clipboard className="h-4 w-4" />;
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'mention':
        return <User className="h-4 w-4" />;
      case 'task_update':
        return <Clipboard className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };
  
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task_assignment':
        return 'bg-purple-100 text-purple-600';
      case 'message':
        return 'bg-blue-100 text-blue-600';
      case 'alert':
        return 'bg-red-100 text-red-600';
      case 'mention':
        return 'bg-green-100 text-green-600';
      case 'task_update':
        return 'bg-amber-100 text-amber-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // Check if the related item exists before navigating
    if (notification.relatedItemExists === false) {
      toast({
        title: "Resource Unavailable",
        description: "The resource this notification refers to is no longer available.",
        variant: "destructive"
      });
      return;
    }
    
    if (notification.type === 'task_assignment') {
      navigate(`/tasks/view/${notification.related_id}`, { state: { from: location.pathname } });
    } else if (notification.type === 'task_update') {
      navigate(`/tasks/view/${notification.related_id}`, { state: { from: location.pathname } });
    } else if (notification.type === 'mention') {
      navigate(`/tasks/view/${notification.related_id}`, { state: { from: location.pathname } });
    }
  };

  const handleDeleteNotification = (e: React.MouseEvent, notification: any) => {
    e.stopPropagation();
    setNotificationToDelete(notification);
  };

  const filteredNotifications = activeTab === "unread" 
    ? notifications.filter(n => !n.read)
    : notifications;

  const currentTime = new Date().getTime();
  const newNotifications = filteredNotifications.filter(n => {
    const notificationTime = new Date(n.created_at).getTime();
    return (currentTime - notificationTime) < 24 * 60 * 60 * 1000;
  });
  
  const earlierNotifications = filteredNotifications.filter(n => {
    const notificationTime = new Date(n.created_at).getTime();
    return (currentTime - notificationTime) >= 24 * 60 * 60 * 1000;
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground">Stay updated with your assigned tasks</p>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Your Notifications</CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(activeTab === "all" && "bg-muted")}
              onClick={() => setActiveTab("all")}
            >
              All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(activeTab === "unread" && "bg-muted")}
              onClick={() => setActiveTab("unread")}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length > 0 ? (
            <div className="space-y-4">
              {unreadCount > 0 && (
                <div className="bg-gray-50 p-3 rounded-md border flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">
                      You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Mark all as read
                  </Button>
                  <Button variant="ghost" size="sm" className="p-0 h-auto">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            
              {newNotifications.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">New</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      See all
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {newNotifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className={cn(
                          `relative p-3 border rounded-lg cursor-pointer hover:bg-gray-50`,
                          !notification.read && 'bg-blue-50'
                        )}
                      >
                        <div className="flex items-start gap-3" onClick={() => handleNotificationClick(notification)}>
                          <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1">
                            <p className="text-sm">{notification.content}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {getTimeAgo(notification.created_at)}
                            </p>
                            {notification.relatedItemExists === false && (
                              <DeletedUserInfo 
                                message="The related resource is no longer available" 
                                className="mt-2" 
                              />
                            )}
                          </div>
                          
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                          )}
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="absolute top-2 right-2 text-gray-400 hover:text-destructive h-6 w-6 p-0"
                          onClick={(e) => handleDeleteNotification(e, notification)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {earlierNotifications.length > 0 && (
                <>
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">Earlier</h3>
                    <div className="space-y-2">
                      {earlierNotifications.map(notification => (
                        <div 
                          key={notification.id} 
                          className={cn(
                            `relative p-3 border rounded-lg cursor-pointer hover:bg-gray-50`,
                            !notification.read && 'bg-blue-50',
                            notification.relatedItemExists === false && 'opacity-80'
                          )}
                        >
                          <div className="flex items-start gap-3" onClick={() => handleNotificationClick(notification)}>
                            <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            
                            <div className="flex-1">
                              <p className="text-sm">{notification.content}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {getTimeAgo(notification.created_at)}
                              </p>
                              {notification.relatedItemExists === false && (
                                <DeletedUserInfo 
                                  message="The related resource is no longer available" 
                                  className="mt-2" 
                                />
                              )}
                            </div>
                            
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                            )}
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="absolute top-2 right-2 text-gray-400 hover:text-destructive h-6 w-6 p-0"
                            onClick={(e) => handleDeleteNotification(e, notification)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-medium mb-1">No notifications yet</h3>
              <p className="text-muted-foreground">
                When you receive notifications, they'll appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {notificationToDelete && (
        <NotificationDeleteDialog 
          notificationId={notificationToDelete.id}
          isOpen={!!notificationToDelete}
          onClose={() => setNotificationToDelete(null)}
          afterDelete={refreshNotifications}
        />
      )}
    </DashboardLayout>
  );
};

export default Notifications;
