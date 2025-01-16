import { useToast } from "@/hooks/use-toast";
import { Task } from "@/types/task";
import { supabase } from "@/lib/supabase";
import { handleTaskStatusChange } from "@/utils/notificationUtils";

interface TaskItemProps {
  task: Task;
  showAssignment?: boolean;
  onStatusChange?: (taskId: string, newStatus: Task["status"]) => void;
  onTasksChange: () => void;
}

export const TaskItem = ({ 
  task, 
  showAssignment = true,
  onStatusChange,
  onTasksChange 
}: TaskItemProps) => {
  const { toast } = useToast();

  const getNextStatus = (currentStatus: Task["status"]): Task["status"] => {
    switch (currentStatus) {
      case "pending":
        return "in-progress";
      case "in-progress":
        return "completed";
      case "completed":
        return "pending";
      default:
        return "pending";
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
      
      if (onStatusChange) {
        onStatusChange(task.id, nextStatus);
      }
      onTasksChange();
      
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
    <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex-1">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{task.title}</h3>
        {showAssignment && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Assigned to: {task.assigned_to}
          </p>
        )}
      </div>
      <button
        onClick={handleStatusClick}
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          task.status === "completed"
            ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
            : task.status === "in-progress"
            ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
        }`}
      >
        {task.status.replace("-", " ")}
      </button>
    </div>
  );
};