import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TaskFileUploader from "@/components/TaskFileUploader";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CreateTaskFormProps {
  initialDueDate?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface NotificationData {
  recipient: string;
  type: string;
  title: string;
  content: string;
  related_id?: string;
  read: boolean;
}

interface FileAttachment {
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  task_id?: string;
}

const CreateTaskForm = ({ initialDueDate }: CreateTaskFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: initialDueDate || "",
    priority: "medium",
    assignee: ""
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialDueDate ? new Date(initialDueDate) : undefined
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    initialDueDate ? new Date(initialDueDate) : new Date()
  );

  useEffect(() => {
    const dueDateString = initialDueDate || location.state?.dueDate;
    
    if (dueDateString) {
      const dateObject = new Date(dueDateString);
      setFormData(prev => ({ ...prev, due_date: dueDateString }));
      setSelectedDate(dateObject);
      setCalendarMonth(dateObject);
      console.log("Setting due date:", dueDateString);
    }
    
    fetchEmployees();
  }, [initialDueDate, location.state]);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email, role')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employees list",
        variant: "destructive"
      });
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");
      setFormData(prev => ({ ...prev, due_date: formattedDate }));
      setCalendarMonth(date);
    } else {
      setFormData(prev => ({ ...prev, due_date: "" }));
    }
    setCalendarOpen(false);
  };

  const handleMonthChange = (date: Date) => {
    console.log("Month changed to:", format(date, "MMMM yyyy"));
    setCalendarMonth(date);
  };

  const handleFileUpload = (files: FileAttachment[]) => {
    setFileAttachments(prev => [...prev, ...files]);
  };

  const createNotification = async (taskId: string, taskData: any, assigneeEmail: string): Promise<void> => {
    try {
      const assigneeNotification: NotificationData = {
        recipient: assigneeEmail,
        type: "task_assignment",
        title: "New Task Assigned",
        content: `You have been assigned a new task: ${taskData.title}`,
        related_id: taskId,
        read: false
      };

      await supabase
        .from('notifications')
        .insert(assigneeNotification);
      
      console.log("Assignee notification created successfully");
      
    } catch (error) {
      console.error('Error creating notification:', error);
      // We don't want to block the task creation if notification fails
      // so we just log the error but don't throw it
    }
  };

  const saveAttachments = async (taskId: string) => {
    try {
      if (fileAttachments.length === 0) return;
      
      const attachmentsWithTaskId = fileAttachments.map(attachment => ({
        ...attachment,
        task_id: taskId
      }));
      
      const { error } = await supabase
        .from('task_attachments')
        .insert(attachmentsWithTaskId);
      
      if (error) {
        throw error;
      }
      
      console.log("Attachments saved successfully");
    } catch (error) {
      console.error('Error saving attachments:', error);
      toast({
        title: "Warning",
        description: "Task was created but some attachments couldn't be saved",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.due_date || !formData.assignee) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedEmployee = employees.find(emp => emp.id === formData.assignee);
      
      if (!selectedEmployee) {
        throw new Error("Selected employee not found");
      }
      
      const taskData = { 
        title: formData.title,
        description: formData.description,
        due_date: formData.due_date,
        priority: formData.priority,
        assignee: selectedEmployee.id,
        status: 'pending',
        creator: user?.email || 'System'
      };
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select();

      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        await saveAttachments(data[0].id);
        await createNotification(data[0].id, taskData, selectedEmployee.email);
      }
      
      toast({
        title: "Success",
        description: "Task created successfully"
      });
      
      if (location.state?.from === 'calendar') {
        navigate('/calendar');
      } else {
        navigate('/tasks');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Task</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter task title"
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="h-24"
              placeholder="Enter task description"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="due_date" className="block text-sm font-medium mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Select due date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      onMonthChange={handleMonthChange}
                      month={calendarMonth}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <input
                  type="hidden"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="priority" className="block text-sm font-medium mb-1">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="assignee" className="block text-sm font-medium mb-1">
              Assignee <span className="text-red-500">*</span>
            </label>
            <select
              id="assignee"
              name="assignee"
              value={formData.assignee}
              onChange={handleChange}
              className="w-full p-2 border rounded-md"
              disabled={loadingEmployees}
            >
              <option value="">Select assignee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.email})
                </option>
              ))}
            </select>
            {loadingEmployees && (
              <p className="text-xs text-muted-foreground mt-1">Loading employees...</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Attachments
            </label>
            <TaskFileUploader onFileUpload={handleFileUpload} />
            
            {fileAttachments.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">
                  {fileAttachments.length} file(s) ready to be attached
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate('/tasks')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateTaskForm;
