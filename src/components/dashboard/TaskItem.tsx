import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/types/task";
import { handleTaskStatusChange } from "@/utils/notificationUtils";

interface TaskItemProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

const TaskItem = ({ task, onStatusChange }: TaskItemProps) => {
  const { toast } = useToast();

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "pending":
        return "in-progress";
      case "in-progress":
        return "completed";
      case "completed":
        return "pending";
      default:
        return currentStatus;
    }
  };

  const handleStatusClick = async () => {
    try {
      const nextStatus = getNextStatus(task.status);
      
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', task.id);

      if (updateError) throw updateError;

      const updatedTask = { ...task, status: nextStatus };
      await handleTaskStatusChange(updatedTask);
      
      onStatusChange(task.id, nextStatus);
      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
    } catch (error) {
      console.error("Error updating task status:", error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="task-item">
      <h3>{task.title}</h3>
      <button onClick={handleStatusClick}>
        {task.status}
      </button>
    </div>
  );
};

export default TaskItem;
