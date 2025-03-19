
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { PlusCircle, Filter, Search, AlertTriangle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DeletedUserInfo from "@/components/DeletedUserInfo";
import TaskDeleteDialog from "@/components/TaskDeleteDialog";

const Tasks = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [taskToDelete, setTaskToDelete] = useState(null);
  
  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('tasks').select('*');
      
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      const tasksWithEmployeeDetails = await Promise.all(
        (data || []).map(async (task) => {
          try {
            const { data: employeeData, error: employeeError } = await supabase
              .from('employees')
              .select('name, email')
              .eq('id', task.assignee)
              .single();
            
            if (employeeError) {
              console.error("Error fetching employee details:", employeeError);
              return {
                ...task,
                assigneeName: "Deleted User",
                assigneeEmail: "",
                userDeleted: true
              };
            }
            
            return {
              ...task,
              assigneeName: employeeData?.name || "Unknown",
              assigneeEmail: employeeData?.email || "",
              userDeleted: false
            };
          } catch (err) {
            console.error("Error fetching employee details:", err);
            return {
              ...task,
              assigneeName: "Deleted User",
              assigneeEmail: "",
              userDeleted: true
            };
          }
        })
      );
      
      setTasks(tasksWithEmployeeDetails);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTasks();
    
    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tasks' }, 
          (payload) => {
            fetchTasks();
          })
      .subscribe();
      
    return () => {
      supabase.removeChannel(tasksSubscription);
    };
  }, [toast, statusFilter]);
  
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.assigneeName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleRowClick = (event: React.MouseEvent, taskId: string) => {
    const target = event.target as Element;
    const isButton = target.tagName === 'BUTTON' || 
                    target.closest('button') !== null ||
                    target.tagName === 'svg' || 
                    target.closest('svg') !== null;
    
    if (!isButton) {
      console.log("Row clicked, navigating to task:", taskId);
      navigate(`/tasks/${taskId}`);
    }
  };

  const handleViewTask = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    console.log("View button clicked, navigating to task:", taskId);
    navigate(`/tasks/${taskId}`);
  };

  const handleDeleteTask = (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    setTaskToDelete(task);
  };
  
  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Tasks</h1>
            <p className="text-muted-foreground">View and manage tasks</p>
          </div>
          <Button onClick={() => navigate('/create-task')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </div>
        
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks or assignees..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
              className="flex-1 md:flex-none"
            >
              All
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              onClick={() => setStatusFilter("pending")}
              className="flex-1 md:flex-none"
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === "in-progress" ? "default" : "outline"}
              onClick={() => setStatusFilter("in-progress")}
              className="flex-1 md:flex-none"
            >
              In Progress
            </Button>
            <Button
              variant={statusFilter === "completed" ? "default" : "outline"}
              onClick={() => setStatusFilter("completed")}
              className="flex-1 md:flex-none"
            >
              Completed
            </Button>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 text-center">
                <p className="text-muted-foreground">Loading tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-muted-foreground">No tasks found</p>
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Title</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Assignee</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Due Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Priority</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr 
                        key={task.id} 
                        className="border-b cursor-pointer hover:bg-secondary/50 transition-colors"
                        onClick={(e) => handleRowClick(e, task.id)}
                      >
                        <td className="px-4 py-3">{task.title}</td>
                        <td className="px-4 py-3">
                          {task.userDeleted ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1">
                                    <span>{task.assigneeName}</span>
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <p>User account has been deleted</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            task.assigneeName
                          )}
                        </td>
                        <td className="px-4 py-3">{new Date(task.due_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant="outline" 
                            className={
                              task.priority === "high" ? "border-red-500 text-red-500" :
                              task.priority === "medium" ? "border-amber-500 text-amber-500" :
                              "border-blue-500 text-blue-500"
                            }
                          >
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant="outline" 
                            className={
                              task.status === "completed" ? "border-green-500 text-green-500" :
                              task.status === "in-progress" ? "border-blue-500 text-blue-500" :
                              "border-amber-500 text-amber-500"
                            }
                          >
                            {task.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => handleViewTask(e, task.id)}
                            >
                              View
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={(e) => handleDeleteTask(e, task)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {taskToDelete && (
        <TaskDeleteDialog 
          taskId={taskToDelete.id}
          taskTitle={taskToDelete.title}
          isOpen={!!taskToDelete}
          onClose={() => setTaskToDelete(null)}
          afterDelete={fetchTasks}
        />
      )}
    </DashboardLayout>
  );
};

export default Tasks;
