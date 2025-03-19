
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus,
  ListCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Calendar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateTasks, setSelectedDateTasks] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('due_date', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        setTasks(data || []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: "Error",
          description: "Failed to fetch tasks. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    const subscription = supabase
      .channel('tasks-channel')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tasks' }, 
          (payload) => {
            fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [toast]);

  const handleAddTaskOnDate = (date) => {
    navigate('/tasks/create', { 
      state: { 
        dueDate: date,
        from: 'calendar' 
      } 
    });
  };

  const handleViewTask = (taskId) => {
    navigate(`/tasks/view/${taskId}`);
  };

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
  
  const month = currentMonth.getMonth();
  const year = currentMonth.getFullYear();
  const days = daysInMonth(month, year);
  const firstDay = firstDayOfMonth(month, year);

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1));
    setSelectedDate(null);
    setSelectedDateTasks([]);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1));
    setSelectedDate(null);
    setSelectedDateTasks([]);
  };

  const handleDateClick = (day, date) => {
    setSelectedDate(date);
    const tasksOnSelectedDate = tasks.filter(task => task.due_date === date);
    setSelectedDateTasks(tasksOnSelectedDate);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", 
                       "July", "August", "September", "October", "November", "December"];

  const formatDateForComparison = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-24 border border-border p-1"></div>);
  }
  
  for (let day = 1; day <= days; day++) {
    const date = formatDateForComparison(year, month, day);
    const dayTasks = tasks.filter(task => task.due_date === date);
    const isSelected = selectedDate === date;
    
    calendarDays.push(
      <div 
        key={day} 
        className={`h-24 border border-border p-1 overflow-hidden relative cursor-pointer transition-colors 
                   ${isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-secondary/50'}`}
        onClick={() => handleDateClick(day, date)}
      >
        <div className="text-sm font-medium mb-1 flex items-center justify-between">
          <span>{day}</span>
          <button 
            className="rounded-full bg-secondary w-5 h-5 flex items-center justify-center text-xs hover:bg-primary hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleAddTaskOnDate(date);
            }}
            title="Add task on this date"
            aria-label={`Add task for ${date}`}
            data-date={date}
          >
            +
          </button>
        </div>
        {dayTasks.map((task, idx) => idx < 2 && (
          <div 
            key={task.id} 
            className={`text-xs p-1 mb-1 rounded truncate ${
              task.priority === 'high' ? 'bg-red-100 text-red-800' :
              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}
            title={task.title}
            onClick={(e) => {
              e.stopPropagation();
              handleViewTask(task.id);
            }}
          >
            {task.title}
          </div>
        ))}
        {dayTasks.length > 2 && (
          <div className="text-xs text-muted-foreground mt-1 text-center">
            +{dayTasks.length - 2} more
          </div>
        )}
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">HR Calendar</h1>
          <p className="text-muted-foreground">Schedule and view task deadlines</p>
        </div>
        <Button 
          onClick={() => navigate('/tasks/create', { state: { from: 'calendar' } })}
          aria-label="Add new task"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <span>{monthNames[month]} {year}</span>
                </div>
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-medium text-sm py-2">
                    {day}
                  </div>
                ))}
                {calendarDays}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          {!selectedDate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>Upcoming Deadlines</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading tasks...</div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-4">No upcoming tasks</div>
                ) : (
                  <div className="space-y-4">
                    {tasks.slice(0, 5).map(task => (
                      <div 
                        key={task.id} 
                        className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary"
                        onClick={() => handleViewTask(task.id)}
                      >
                        <div className="flex flex-col items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                          <div className="text-xs font-bold">{task.due_date.split('-')[2]}</div>
                          <div className="text-[10px]">{monthNames[parseInt(task.due_date.split('-')[1]) - 1].substring(0, 3)}</div>
                        </div>
                        <div>
                          <h3 className="font-medium">{task.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {task.priority}
                            </span>
                            <span>{task.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedDate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <ListCheck className="h-5 w-5 text-primary" />
                  <span>Tasks for {new Date(selectedDate).toLocaleDateString()}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateTasks.length === 0 ? (
                  <div className="text-center py-4">
                    No tasks scheduled for this date
                    <div className="mt-2">
                      <Button variant="outline" size="sm" onClick={() => handleAddTaskOnDate(selectedDate)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Task
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateTasks.map(task => (
                      <div 
                        key={task.id} 
                        className="p-3 rounded-lg border hover:bg-secondary/50 cursor-pointer transition-colors"
                        onClick={() => handleViewTask(task.id)}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{task.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            task.priority === 'high' ? 'bg-red-100 text-red-800' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>Assignee: {task.assignee}</span>
                          <span className="capitalize">Status: {task.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
