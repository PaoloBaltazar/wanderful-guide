import { useState, useEffect } from "react";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabase";
import { MessageSquare, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Avatar } from "@/components/ui/avatar";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  task_id: string;
  user: {
    email: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface CommentListProps {
  taskId: string;
}

export const CommentList = ({ taskId }: CommentListProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const { session } = useSessionContext();
  const { toast } = useToast();

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        user:profiles!comments_user_id_fkey (
          email,
          full_name,
          avatar_url
        )
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch comments",
        variant: "destructive",
      });
      return;
    }

    setComments(data as Comment[]);
  };

  useEffect(() => {
    fetchComments();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("comments_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !session?.user) return;

    // Extract mentions from comment
    const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const mentions = [...newComment.matchAll(mentionRegex)].map(match => match[1]);

    const { error } = await supabase.from("comments").insert({
      task_id: taskId,
      user_id: session.user.id,
      content: newComment,
      mentions: mentions,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
      return;
    }

    setNewComment("");
    toast({
      title: "Success",
      description: "Comment posted successfully",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <MessageSquare className="w-5 h-5" />
        <h3 className="font-medium">Comments</h3>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment... Use @ to mention someone"
            className="min-h-[80px]"
          />
          <Button onClick={handleSubmitComment} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <Avatar className="w-8 h-8">
                {comment.user?.avatar_url ? (
                  <img src={comment.user.avatar_url} alt={comment.user.full_name} />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">
                    {comment.user?.full_name || comment.user?.email}
                  </p>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};