
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskComment {
  id: string;
  task_id: string;
  user_email: string;
  content: string;
  created_at: string;
  mentioned_employees: string[];
  user_exists?: boolean; // New property to track if user still exists
}

interface TaskCommentsListProps {
  taskId: string;
  refreshTrigger?: number;
}

const TaskCommentsList = ({ taskId, refreshTrigger }: TaskCommentsListProps) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
    
    // Set up a real-time subscription for comments
    const subscription = supabase
      .channel('task-comments-changes')
      .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` }, 
          (payload) => {
            setComments(prev => [payload.new as unknown as TaskComment, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [taskId, refreshTrigger]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      // Use RPC function instead of direct table access
      const { data, error } = await supabase.rpc('get_task_comments', {
        p_task_id: taskId
      });
      
      if (error) {
        throw error;
      }
      
      // Check if each commenter still exists in the employees table
      const commentsWithUserStatus = await Promise.all(
        (data as TaskComment[] || []).map(async (comment) => {
          const { data: userData, error: userError } = await supabase
            .from('employees')
            .select('email')
            .eq('email', comment.user_email)
            .maybeSingle();
            
          return {
            ...comment,
            user_exists: !userError && userData !== null
          };
        })
      );
      
      setComments(commentsWithUserStatus);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCommentContent = (content: string) => {
    // Highlight mentions with a different color
    return content.replace(/@(\w+)/g, '<span class="text-primary font-medium">@$1</span>');
  };

  if (loading) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Loading comments...
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No comments yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map(comment => (
        <div key={comment.id} className="border rounded-md p-3 bg-background">
          <div className="flex justify-between items-start mb-1">
            <div className="font-medium flex items-center gap-1.5">
              {comment.user_exists ? (
                comment.user_email
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <span>{comment.user_email}</span>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>User account has been deleted</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </div>
          </div>
          <p 
            className="text-sm whitespace-pre-wrap" 
            dangerouslySetInnerHTML={{ __html: formatCommentContent(comment.content) }}
          />
          {!comment.user_exists && (
            <div className="mt-2 text-xs text-muted-foreground italic">
              <AlertTriangle className="h-3 w-3 inline-block mr-1 text-amber-500" />
              This comment was made by a user who has since been deleted
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TaskCommentsList;
