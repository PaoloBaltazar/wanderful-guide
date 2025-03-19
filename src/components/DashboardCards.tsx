import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, AlertTriangle, MessageSquare, PlusCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CompletedTasksCard } from "./CompletedTasksCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import RecentActivitiesModal from "./RecentActivitiesModal";
export { CompletedTasksCard };
export const MetricCard = ({
  title,
  value,
  change,
  isPositive = true,
  icon,
  className
}: {
  title: string;
  value: string;
  change: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  className?: string;
}) => <Card className={cn("card-hover overflow-hidden", className)}>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="rounded-full p-1 bg-secondary">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 flex items-center text-xs">
        <span className={cn("flex items-center gap-1 font-semibold", isPositive ? "text-emerald-500" : "text-rose-500")}>
          {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {change}
        </span>
        <span className="text-muted-foreground ml-1">from last month</span>
      </div>
    </CardContent>
  </Card>;
export const TaskCard = ({
  currentPath
}: {
  currentPath?: string;
}) => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const {
          data: employeeData,
          error: employeeError
        } = await supabase.from('employees').select('id, email').eq('email', user?.email || '').maybeSingle();
        if (employeeError) {
          throw employeeError;
        }
        const {
          data: allEmployees,
          error: allEmployeesError
        } = await supabase.from('employees').select('id, email, name');
        if (allEmployeesError) {
          throw allEmployeesError;
        }
        setEmployees(allEmployees || []);
        if (employeeData?.id) {
          const {
            data,
            error
          } = await supabase.from('tasks').select('*').in('status', ['pending', 'in-progress']).eq('assignee', employeeData.id).order('created_at', {
            ascending: false
          });
          if (error) {
            throw error;
          }
          setTasks(data || []);
        } else {
          setTasks([]);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: "Error",
          description: "Failed to fetch tasks",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    if (user?.email) {
      fetchEmployees();
    } else {
      setLoading(false);
    }
    const subscription = supabase.channel('dashboard-tasks-channel').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks'
    }, payload => {
      if (user?.email) {
        fetchEmployees();
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [toast, user]);
  if (loading) {
    return <Card className="card-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">My Tasks</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>
            View All
          </Button>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-center text-muted-foreground py-4">Loading tasks...</p>
        </CardContent>
      </Card>;
  }
  const pendingTasks = tasks.filter(task => task.status === "pending" || task.status === "in-progress");
  const getEmployeeName = employeeId => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.name || employeeId;
  };
  const handleTaskClick = taskId => {
    console.log("Navigating to task from Dashboard:", taskId);
    navigate(`/tasks/${taskId}`);
  };
  return <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">My Tasks</CardTitle>
        <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>
          View All
        </Button>
      </CardHeader>
      <CardContent className="pb-2">
        {pendingTasks.length === 0 ? <p className="text-center text-muted-foreground py-4">
            {user?.email ? "No pending tasks assigned to you" : "Please sign in to view your tasks"}
          </p> : <ul className="space-y-4">
            {pendingTasks.map((task, index) => <li key={task.id} className="flex items-start gap-2 animate-fade-in cursor-pointer hover:bg-secondary/50 p-2 rounded-md transition-colors" style={{
          animationDelay: `${index * 100}ms`
        }} onClick={() => handleTaskClick(task.id)}>
                <div className={cn("mt-0.5 h-5 w-5 rounded-full flex items-center justify-center", task.status === "pending" ? "bg-amber-100 text-amber-500" : task.status === "in-progress" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-500")}>
                  {task.status === "completed" ? <CheckCircle2 className="h-4 w-4" /> : task.status === "in-progress" ? <Clock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <span className="text-sm">{task.title}</span>
                  <div className="flex items-center mt-0.5 gap-2">
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full", task.priority === "high" ? "bg-red-100 text-red-800" : task.priority === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800")}>
                      {task.priority}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getEmployeeName(task.assignee)} • Due {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </li>)}
          </ul>}
      </CardContent>
      <CardFooter className="pt-2">
        <Button className="w-full justify-center" variant="outline" onClick={() => navigate('/create-task')}>
          Create New Task
        </Button>
      </CardFooter>
    </Card>;
};
export const TaskStatisticsCard = ({
  currentPath
}: {
  currentPath?: string;
}) => {
  const [stats, setStats] = useState([{
    id: 1,
    label: "Pending",
    count: 0,
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    bgColor: "bg-amber-100"
  }, {
    id: 2,
    label: "In Progress",
    count: 0,
    icon: <Clock className="h-4 w-4 text-blue-600" />,
    bgColor: "bg-blue-100"
  }, {
    id: 3,
    label: "Completed",
    count: 0,
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    bgColor: "bg-emerald-100"
  }]);
  const [loading, setLoading] = useState(true);
  const [previousCounts, setPreviousCounts] = useState({
    pending: 0,
    "in-progress": 0,
    completed: 0
  });
  const [changePercentages, setChangePercentages] = useState({
    pending: "0%",
    "in-progress": "0%",
    completed: "0%"
  });
  const {
    toast
  } = useToast();
  useEffect(() => {
    const fetchTaskStats = async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('tasks').select('status');
        if (error) {
          throw error;
        }
        const counts = {
          pending: 0,
          "in-progress": 0,
          completed: 0
        };
        data.forEach(task => {
          counts[task.status] = (counts[task.status] || 0) + 1;
        });
        const changes = {
          pending: calculateChangePercentage(previousCounts.pending, counts.pending),
          "in-progress": calculateChangePercentage(previousCounts["in-progress"], counts["in-progress"]),
          completed: calculateChangePercentage(previousCounts.completed, counts.completed)
        };
        setChangePercentages(changes);
        setPreviousCounts(counts);
        setStats([{
          id: 1,
          label: "Pending",
          count: counts.pending,
          icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
          bgColor: "bg-amber-100"
        }, {
          id: 2,
          label: "In Progress",
          count: counts["in-progress"],
          icon: <Clock className="h-4 w-4 text-blue-600" />,
          bgColor: "bg-blue-100"
        }, {
          id: 3,
          label: "Completed",
          count: counts.completed,
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          bgColor: "bg-emerald-100"
        }]);
      } catch (error) {
        console.error('Error fetching task statistics:', error);
        toast({
          title: "Error",
          description: "Failed to fetch task statistics",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    const calculateChangePercentage = (oldValue: number, newValue: number): string => {
      if (oldValue === 0) return "0%";
      const change = (newValue - oldValue) / oldValue * 100;
      return `${Math.abs(change).toFixed(1)}%`;
    };
    fetchTaskStats();
    const subscription = supabase.channel('stats-tasks-channel').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks'
    }, payload => {
      fetchTaskStats();
    }).subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [toast]);
  return <Card className="card-hover">
      <CardHeader>
        <CardTitle className="text-base">Task Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-center text-muted-foreground py-4">Loading statistics...</p> : <div className="grid grid-cols-3 gap-4">
            {stats.map(stat => <div key={stat.id} className="flex flex-col items-center p-3 rounded-lg bg-secondary/30">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mb-2", stat.bgColor)}>
                  {stat.icon}
                </div>
                <span className="text-2xl font-bold">{stat.count}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>)}
          </div>}
      </CardContent>
    </Card>;
};
export const OverviewCard = () => <Card className="col-span-2 card-hover overflow-hidden">
    <CardHeader className="pb-2">
      <CardTitle className="text-base">HR Department Overview</CardTitle>
    </CardHeader>
    <CardContent className="h-[180px] flex items-center justify-center">
      <div className="w-full h-full relative">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground">Department performance metrics will appear here</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card to-transparent"></div>
      </div>
    </CardContent>
  </Card>;
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
export const UserActivityCard = ({
  currentPath
}: {
  currentPath?: string;
}) => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [maxActivitiesToShow, setMaxActivitiesToShow] = useState(15);
  useEffect(() => {
    const updateActivitiesCount = () => {
      if (window.innerHeight > 1000) {
        setMaxActivitiesToShow(18);
      } else if (window.innerHeight > 900) {
        setMaxActivitiesToShow(16);
      } else if (window.innerHeight > 800) {
        setMaxActivitiesToShow(14);
      } else if (window.innerHeight > 700) {
        setMaxActivitiesToShow(12);
      } else {
        setMaxActivitiesToShow(10);
      }
    };
    updateActivitiesCount();
    window.addEventListener('resize', updateActivitiesCount);
    return () => {
      window.removeEventListener('resize', updateActivitiesCount);
    };
  }, []);
  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        setLoading(true);
        const {
          data: employees,
          error: employeesError
        } = await supabase.from('employees').select('id, name, email').limit(20);
        if (employeesError) throw employeesError;
        if (!employees || employees.length === 0) {
          setActivities([]);
          return;
        }
        const fetchLimit = maxActivitiesToShow * 5;
        const {
          data: recentTasks,
          error: tasksError
        } = await supabase.from('tasks').select('id, title, creator, assignee, created_at, status').order('created_at', {
          ascending: false
        }).limit(fetchLimit);
        if (tasksError) throw tasksError;
        const mappedActivities: UserActivity[] = [];
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
        const {
          data: recentComments,
          error: commentsError
        } = await supabase.from('task_comments').select('id, task_id, user_email, created_at, content').order('created_at', {
          ascending: false
        }).limit(fetchLimit);
        if (commentsError) throw commentsError;
        if (recentComments && recentComments.length > 0) {
          const taskIds = recentComments.map(comment => comment.task_id);
          const {
            data: taskDetails,
            error: taskDetailsError
          } = await supabase.from('tasks').select('id, title').in('id', taskIds);
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
        if (mappedActivities.length < maxActivitiesToShow * 2) {
          const {
            data: notifications,
            error: notificationsError
          } = await supabase.from('notifications').select('*').order('created_at', {
            ascending: false
          }).limit(fetchLimit);
          if (!notificationsError && notifications) {
            for (const notification of notifications) {
              const recipient = employees.find(emp => emp.id === notification.recipient);
              if (recipient) {
                mappedActivities.push({
                  id: `notification-${notification.id}`,
                  name: recipient.name,
                  action: "Received notification",
                  taskTitle: notification.title,
                  timestamp: new Date(notification.created_at),
                  time: formatTimeAgo(new Date(notification.created_at)),
                  relatedId: notification.related_id,
                  type: 'notification'
                });
              }
            }
          }
        }
        mappedActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(mappedActivities.slice(0, maxActivitiesToShow));
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
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };
    fetchRecentActivities();
    const tasksSubscription = supabase.channel('activities-tasks-channel').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks'
    }, () => fetchRecentActivities()).subscribe();
    const commentsSubscription = supabase.channel('activities-comments-channel').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'task_comments'
    }, () => fetchRecentActivities()).subscribe();
    const notificationsSubscription = supabase.channel('activities-notifications-channel').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications'
    }, () => fetchRecentActivities()).subscribe();
    return () => {
      supabase.removeChannel(tasksSubscription);
      supabase.removeChannel(commentsSubscription);
      supabase.removeChannel(notificationsSubscription);
    };
  }, [toast, maxActivitiesToShow]);
  const handleActivityClick = (activity: UserActivity) => {
    if (!activity.relatedId) return;
    if (activity.type === 'task' || activity.type === 'comment') {
      navigate(`/tasks/${activity.relatedId}`);
    } else if (activity.type === 'notification') {
      if (activity.relatedId) {
        navigate(`/tasks/${activity.relatedId}`);
      } else {
        navigate('/notifications');
      }
    }
  };
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'task':
        return <PlusCircle className="h-4 w-4 text-green-500" />;
      case 'notification':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };
  return <>
      <Card className="card-hover h-full flex flex-col py-0 my-0">
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-auto p-3 pb-0">
          {loading ? <div className="py-8 flex justify-center h-full items-center">
              <p className="text-sm text-muted-foreground">Loading activities...</p>
            </div> : activities.length === 0 ? <div className="py-8 flex justify-center h-full items-center">
              <p className="text-sm text-muted-foreground">No recent activities found</p>
            </div> : <div className="space-y-1 h-full flex flex-col">
              {activities.map((activity, index) => <div key={activity.id} style={{
            animationDelay: `${index * 100}ms`
          }} onClick={() => handleActivityClick(activity)} className="flex items-start gap-2 animate-fade-in hover:bg-secondary/50 rounded-md p-1 cursor-pointer transition-colors py-[13px]">
                  <Avatar className="h-6 w-6 bg-secondary">
                    <AvatarFallback className="text-xs">
                      {activity.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{activity.name}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="inline-flex items-center gap-1">
                        {getActivityIcon(activity.type)}
                        <span>{activity.action} on</span>
                      </span>
                      <span className="truncate font-medium text-foreground">
                        {activity.taskTitle}
                      </span>
                    </div>
                  </div>
                </div>)}
              <div className="py-1"></div>
            </div>}
        </CardContent>
        <CardFooter className="pt-1 pb-2 mt-auto">
          <Button className="w-full justify-center text-xs h-7" variant="ghost" onClick={() => setShowAllActivities(true)}>
            View All Activities
          </Button>
        </CardFooter>
      </Card>
      
      <RecentActivitiesModal isOpen={showAllActivities} onOpenChange={setShowAllActivities} />
    </>;
};