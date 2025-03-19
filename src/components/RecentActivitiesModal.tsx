
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, PlusCircle, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

type UserActivity = {
  id: string;
  name: string;
  action: string;
  time: string;
  timestamp: Date;
  relatedId?: string | null;
  type: string;
  taskTitle?: string;
};

interface RecentActivitiesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ITEMS_PER_PAGE = 10;

const RecentActivitiesModal = ({ isOpen, onOpenChange }: RecentActivitiesModalProps) => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalActivities, setTotalActivities] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchRecentActivities();
    }
  }, [isOpen, currentPage]);

  const fetchRecentActivities = async () => {
    try {
      setLoading(true);
      
      // Fetch all employees first
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, email');
      
      if (employeesError) throw employeesError;
      
      if (!employees || employees.length === 0) {
        setActivities([]);
        return;
      }
      
      // Fetch tasks with pagination
      const { data: recentTasks, error: tasksError, count: tasksCount } = await supabase
        .from('tasks')
        .select('id, title, creator, assignee, created_at, status', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
      
      if (tasksError) throw tasksError;
      
      // Set total count for pagination
      if (tasksCount !== null) {
        setTotalActivities(tasksCount);
      }
      
      const mappedActivities: UserActivity[] = [];
      
      // Map tasks to activities
      for (const task of recentTasks || []) {
        const creator = employees.find(emp => emp.email === task.creator);
        
        if (creator) {
          mappedActivities.push({
            id: `task-create-${task.id}`,
            name: creator.name,
            action: `Created task`,
            taskTitle: task.title,
            timestamp: new Date(task.created_at),
            time: formatTimeAgo(new Date(task.created_at)),
            relatedId: task.id,
            type: 'task'
          });
        }
      }
      
      // Fetch comments
      const { data: recentComments, error: commentsError } = await supabase
        .from('task_comments')
        .select('id, task_id, user_email, created_at, content')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
      
      if (commentsError) throw commentsError;
      
      // If we have task comments, fetch the associated task titles
      if (recentComments && recentComments.length > 0) {
        const taskIds = recentComments.map(comment => comment.task_id);
        
        const { data: taskDetails, error: taskDetailsError } = await supabase
          .from('tasks')
          .select('id, title')
          .in('id', taskIds);
          
        if (taskDetailsError) throw taskDetailsError;
        
        for (const comment of recentComments) {
          const commenter = employees.find(emp => emp.email === comment.user_email);
          const relatedTask = taskDetails?.find(task => task.id === comment.task_id);
          
          if (commenter) {
            mappedActivities.push({
              id: `comment-${comment.id}`,
              name: commenter.name,
              action: "Added a comment",
              taskTitle: relatedTask?.title || "a task",
              timestamp: new Date(comment.created_at),
              time: formatTimeAgo(new Date(comment.created_at)),
              relatedId: comment.task_id,
              type: 'comment'
            });
          }
        }
      }
      
      // Sort activities by timestamp
      mappedActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setActivities(mappedActivities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      toast({
        title: "Error",
        description: "Failed to fetch recent activities",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  };
  
  const handleActivityClick = (activity: UserActivity) => {
    if (!activity.relatedId) return;
    
    if (activity.type === 'task' || activity.type === 'comment') {
      navigate(`/tasks/${activity.relatedId}`);
      onOpenChange(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'task':
        return <PlusCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const totalPages = Math.ceil(totalActivities / ITEMS_PER_PAGE);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[calc(100vh-4rem)] p-0 gap-0 my-8 flex flex-col">
        <DialogHeader className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">Recent Activities</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-grow px-6 py-4 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No recent activities found</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[200px]">User</TableHead>
                  <TableHead className="w-[200px]">Action</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead className="text-right w-[120px]">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow 
                    key={activity.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleActivityClick(activity)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-secondary">
                          <AvatarFallback className="text-xs">
                            {activity.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{activity.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 bg-muted/40 rounded-full py-1 px-3 w-fit">
                        {getActivityIcon(activity.type)}
                        <span>{activity.action}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{activity.taskTitle}</TableCell>
                    <TableCell className="text-muted-foreground text-right">{activity.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
        
        {totalPages > 1 && (
          <div className="border-t px-6 py-3 mt-auto">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 gap-1"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="border-t px-6 py-3 mt-auto">
          <DialogClose asChild>
            <Button variant="outline" size="sm">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecentActivitiesModal;
