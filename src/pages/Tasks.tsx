
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { TaskList } from "@/components/dashboard/TaskList";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/types/task";
import { taskService } from "@/services/taskService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Tasks = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: taskService.getTasks,
    staleTime: 0,
    gcTime: 0,
  });

  const filteredTasks = tasks.filter((task: Task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.created_by.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === "all" ? true : task.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" ? true : task.status === statusFilter;
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const handleTasksChange = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  if (tasksLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">All HR Tasks</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">View and manage all HR department tasks</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Tasks</label>
            <Input
              placeholder="Search by title or creator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority</label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <TaskList 
            title="All Department Tasks" 
            tasks={filteredTasks}
            onStatusChange={(taskId, newStatus) => {
              console.log("Status changed:", taskId, newStatus);
            }}
            onTasksChange={handleTasksChange}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Tasks;
