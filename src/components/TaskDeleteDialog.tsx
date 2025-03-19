import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TaskDeleteDialogProps {
  taskId: string;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
  afterDelete?: () => void;
}

const TaskDeleteDialog = ({ 
  taskId, 
  taskTitle, 
  isOpen, 
  onClose, 
  afterDelete 
}: TaskDeleteDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      // Delete all comments related to this task
      const { error: commentsError } = await supabase
        .from('task_comments')
        .delete()
        .eq('task_id', taskId);
      
      if (commentsError) {
        console.error("Error deleting comments:", commentsError);
        throw commentsError;
      }
      
      // Delete all notifications related to this task
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('related_id', taskId);
      
      if (notificationsError) {
        console.error("Error deleting notifications:", notificationsError);
        throw notificationsError;
      }
      
      // Delete the task
      const { error: taskError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (taskError) {
        console.error("Error deleting task:", taskError);
        throw taskError;
      }
      
      toast({
        title: "Task deleted",
        description: `The task "${taskTitle}" has been deleted successfully.`
      });
      
      onClose();
      
      // If afterDelete callback exists, call it
      if (afterDelete) {
        afterDelete();
      } else {
        // Otherwise navigate to tasks page
        navigate('/tasks');
      }
    } catch (error) {
      console.error("Error in delete operation:", error);
      toast({
        title: "Error",
        description: "Failed to delete the task. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Task
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the task "{taskTitle}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDeleteDialog;
