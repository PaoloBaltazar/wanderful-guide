import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Calendar, Clock, User, CheckCircle, AlertTriangle, MessageSquare, Paperclip } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskCommentBox from "@/components/TaskCommentBox";
import TaskCommentsList from "@/components/TaskCommentsList";
import TaskAttachmentsList from "@/components/TaskAttachmentsList";
import TaskFileUploader from "@/components/TaskFileUploader";
import { useAuth } from "@/contexts/AuthContext";
import DeletedUserInfo from "@/components/DeletedUserInfo";

const ViewTask = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState("");
  const [refreshAttachments, setRefreshAttachments] = useState(0);
  const [refreshComments, setRefreshComments] = useState(0);
  const [attachmentsCount, setAttachmentsCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [assigneeExists, setAssigneeExists] = useState(true);

  const referrer = location.state?.referrer || '/tasks';

  useEffect(() => {
    const fetchTask = async () => {
      try {
        console.log("Fetching task with ID parameter:", taskId);
        if (!taskId) {
          throw new Error("Task ID is missing");
        }
        
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();
        
        if (error) {
          throw error;
        }
        
        console.log("Task data retrieved:", data);
        setTask(data);
        
        if (data.assignee) {
          const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .select('name')
            .eq('id', data.assignee)
            .maybeSingle();
            
          if (!employeeError && employeeData) {
            setEmployeeName(employeeData.name);
            setAssigneeExists(true);
          } else {
            setEmployeeName("Deleted User");
            setAssigneeExists(false);
          }
        }
        
        fetchCounts();
        
      } catch (error) {
        console.error('Error fetching task:', error);
        toast({
          title: "Error",
          description: "Failed to fetch task details. The task may not exist.",
          variant: "destructive"
        });
        navigate('/tasks');
      } finally {
        setLoading(false);
      }
    };

    const fetchCounts = async () => {
      try {
        const { count: attachCount, error: attachError } = await supabase
          .from('task_attachments')
          .select('*', { count: 'exact', head: true })
          .eq('task_id', taskId);
          
        if (!attachError) {
          setAttachmentsCount(attachCount || 0);
        }
        
        const { data: commentData, error: commentError } = await supabase.rpc('get_task_comments_count', {
          p_task_id: taskId
        });
          
        if (!commentError) {
          setCommentsCount(commentData || 0);
        }
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };

    if (taskId) {
      fetchTask();
    } else {
      console.error("No task ID provided in URL params");
      navigate('/tasks');
    }
    
    const taskSubscription = supabase
      .channel('task-details-changes')
      .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${taskId}` }, 
          (payload) => {
            setTask(payload.new);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(taskSubscription);
    };
  }, [taskId, toast, navigate]);

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const handleStatusChange = async (newStatus) => {
    try {
      const { data: taskData, error: taskFetchError } = await supabase
        .from('tasks')
        .select('creator, title')
        .eq('id', taskId)
        .single();
        
      if (taskFetchError) {
        throw taskFetchError;
      }
      
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      
      if (error) {
        throw error;
      }
      
      if (user && taskData.creator !== user.email) {
        const notificationData = {
          recipient: taskData.creator,
          type: "task_update",
          title: "Task Status Updated",
          content: `The task "${taskData.title}" has been updated to ${newStatus} by ${employeeName || user.email}`,
          related_id: taskId,
          read: false
        };
        
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationData);
          
        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        }
      }
      
      setTask(prev => ({ ...prev, status: newStatus }));
      
      toast({
        title: "Status updated",
        description: `Task status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      });
    }
  };
  
  const handleFileUpload = async (files) => {
    try {
      if (files.length === 0) return;
      
      const filesWithTaskId = files.map(file => ({
        ...file,
        task_id: taskId
      }));
      
      const { error } = await supabase
        .from('task_attachments')
        .insert(filesWithTaskId);
      
      if (error) {
        throw error;
      }
      
      setRefreshAttachments(prev => prev + 1);
      
      setAttachmentsCount(prev => prev + files.length);
      
      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) added to the task`,
      });
    } catch (error) {
      console.error('Error saving files:', error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive"
      });
    }
  };
  
  const handleCommentAdded = () => {
    setRefreshComments(prev => prev + 1);
    setCommentsCount(prev => prev + 1);
  };

  const handleBackClick = () => {
    navigate(referrer);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="pl-0 mb-2" 
          onClick={handleBackClick}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-2xl font-semibold">Task Details</h1>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : task ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-2xl">{task.title}</CardTitle>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityClass(task.priority)}`}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {task.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                    <p className="text-base whitespace-pre-wrap">{task.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                      <p className="text-base">{formatDate(task.due_date)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Assignee</p>
                      <div className="flex items-center gap-2">
                        <p className="text-base">{employeeName || task.assignee}</p>
                        {!assigneeExists && <DeletedUserInfo message="User account has been deleted" className="mt-1" />}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 py-2 px-4 bg-secondary rounded-lg">
                  {getStatusIcon(task.status)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <div className="flex items-center justify-between">
                      <p className="text-base capitalize">{task.status}</p>
                      
                      <select
                        className="ml-auto text-xs border rounded-md p-1"
                        value={task.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Task Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="comments">
                <TabsList className="mb-4">
                  <TabsTrigger value="comments" className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    Comments
                    {commentsCount > 0 && (
                      <span className="ml-1 text-xs bg-secondary rounded-full w-5 h-5 inline-flex items-center justify-center">
                        {commentsCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="flex items-center gap-1">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                    {attachmentsCount > 0 && (
                      <span className="ml-1 text-xs bg-secondary rounded-full w-5 h-5 inline-flex items-center justify-center">
                        {attachmentsCount}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="comments">
                  <div className="space-y-4">
                    {user && (
                      <TaskCommentBox 
                        taskId={taskId} 
                        onCommentAdded={handleCommentAdded} 
                      />
                    )}
                    
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-3">Comments</h4>
                      <TaskCommentsList taskId={taskId} refreshTrigger={refreshComments} />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="attachments">
                  <div className="space-y-4">
                    {user && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Add Files</h4>
                        <TaskFileUploader taskId={taskId} onFileUpload={handleFileUpload} />
                      </div>
                    )}
                    
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-3">Attached Files</h4>
                      <TaskAttachmentsList taskId={taskId} refreshTrigger={refreshAttachments} />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-4">
              <Button 
                variant="outline" 
                onClick={handleBackClick}
              >
                Back
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Task not found</p>
            <Button 
              variant="default" 
              className="mt-4" 
              onClick={handleBackClick}
            >
              Back
            </Button>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default ViewTask;
