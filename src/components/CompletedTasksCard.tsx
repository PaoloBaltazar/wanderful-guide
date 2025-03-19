
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const CompletedTasksCard = ({ currentPath }: { currentPath?: string }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const fetchCompletedTasks = async () => {
      try {
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('id, email')
          .eq('email', user?.email || '')
          .maybeSingle();
        
        if (employeeError) {
          throw employeeError;
        }
        
        const { data: allEmployees, error: allEmployeesError } = await supabase
          .from('employees')
          .select('id, email, name');
          
        if (allEmployeesError) {
          throw allEmployeesError;
        }
        
        setEmployees(allEmployees || []);
        
        if (employeeData?.id) {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('status', 'completed')
            .eq('assignee', employeeData.id)
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (error) {
            throw error;
          }
          
          setTasks(data || []);
        } else {
          setTasks([]);
        }
      } catch (error) {
        console.error('Error fetching completed tasks:', error);
        toast({
          title: "Error",
          description: "Failed to fetch completed tasks",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchCompletedTasks();
    } else {
      setLoading(false);
    }

    const subscription = supabase
      .channel('completed-tasks-channel')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tasks' }, 
          (payload) => {
            if (user?.email) {
              fetchCompletedTasks();
            }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [toast, user]);

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.name || employeeId;
  };

  const handleTaskClick = (taskId) => {
    // Ensure we're passing the ID parameter correctly and navigating with the absolute path
    console.log("Navigating to task:", taskId);
    navigate(`/tasks/${taskId}`);
  };

  if (loading) {
    return (
      <Card className="card-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">My Completed Tasks</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/tasks')}
          >
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">Loading completed tasks...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">My Completed Tasks</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/tasks')}
        >
          View All
        </Button>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            {user?.email ? "No completed tasks assigned to you" : "Please sign in to view your completed tasks"}
          </p>
        ) : (
          <ul className="space-y-4">
            {tasks.map((task, index) => (
              <li 
                key={task.id} 
                className="flex items-start gap-2 animate-fade-in cursor-pointer hover:bg-secondary/50 p-2 rounded-md transition-colors" 
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => handleTaskClick(task.id)}
              >
                <div className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <span className="text-sm line-through text-muted-foreground">{task.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      task.priority === "high" ? "bg-red-100 text-red-800" : 
                      task.priority === "medium" ? "bg-yellow-100 text-yellow-800" : 
                      "bg-blue-100 text-blue-800"
                    )}>
                      {task.priority}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Assigned to {getEmployeeName(task.assignee)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
