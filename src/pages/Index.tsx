import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  MetricCard, 
  TaskCard, 
  CompletedTasksCard, 
  TaskStatisticsCard, 
  OverviewCard, 
  UserActivityCard 
} from "@/components/DashboardCards";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [metricsLoaded, setMetricsLoaded] = useState(false);
  const [metrics, setMetrics] = useState({
    pending: "0",
    inProgress: "0",
    completed: "0",
    total: "0"
  });
  const [changes, setChanges] = useState({
    pending: { value: "0%", isPositive: false },
    inProgress: { value: "0%", isPositive: true },
    completed: { value: "0%", isPositive: true },
    total: { value: "0%", isPositive: true }
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('status');
        
        if (error) {
          throw error;
        }
        
        const counts = {
          pending: 0,
          "in-progress": 0,
          completed: 0,
          total: 0
        };
        
        data.forEach(task => {
          counts[task.status] = (counts[task.status] || 0) + 1;
          counts.total += 1;
        });
        
        const simulateChange = (count) => {
          const randomChange = Math.random() * 10 - 3;
          return {
            value: `${Math.abs(randomChange).toFixed(1)}%`,
            isPositive: randomChange > 0
          };
        };
        
        setMetrics({
          pending: counts.pending.toString(),
          inProgress: counts["in-progress"].toString(),
          completed: counts.completed.toString(),
          total: counts.total.toString()
        });
        
        setChanges({
          pending: simulateChange(counts.pending),
          inProgress: simulateChange(counts["in-progress"]),
          completed: simulateChange(counts.completed),
          total: simulateChange(counts.total)
        });
        
        setLoading(false);
        setTimeout(() => setMetricsLoaded(true), 500);
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        toast({
          title: "Error",
          description: "Failed to fetch dashboard metrics",
          variant: "destructive"
        });
        setLoading(false);
        setMetricsLoaded(true);
      }
    };
    
    fetchMetrics();
    
    const subscription = supabase
      .channel('dashboard-metrics-channel')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tasks' }, 
          () => fetchMetrics())
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [toast]);

  const handleCelebrate = () => {
    window.location.reload();
    
    toast({
      title: "Woohoo! 🎉",
      description: "You've triggered the confetti celebration!",
    });
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">HR Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your HR management portal</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/tasks/create')} variant="default">
            Create Task
          </Button>
          <Button onClick={handleCelebrate} variant="outline">
            Celebrate!
          </Button>
        </div>
      </div>

      <TaskStatisticsCard currentPath={currentPath} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 mt-6">
        <MetricCard
          title="Pending Tasks"
          value={metrics.pending}
          change={changes.pending.value}
          isPositive={!changes.pending.isPositive}
          icon={<AlertTriangle className="h-4 w-4" />}
          className={`animate-scale-in ${metricsLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        <MetricCard
          title="In Progress"
          value={metrics.inProgress}
          change={changes.inProgress.value}
          isPositive={changes.inProgress.isPositive}
          icon={<Clock className="h-4 w-4" />}
          className={`animate-scale-in delay-100 ${metricsLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        <MetricCard
          title="Completed Tasks"
          value={metrics.completed}
          change={changes.completed.value}
          isPositive={changes.completed.isPositive}
          icon={<CheckCircle className="h-4 w-4" />}
          className={`animate-scale-in delay-200 ${metricsLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        <MetricCard
          title="Total Tasks"
          value={metrics.total}
          change={changes.total.value}
          isPositive={changes.total.isPositive}
          icon={<CheckCircle className="h-4 w-4" />}
          className={`animate-scale-in delay-300 ${metricsLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 space-y-4">
          <TaskCard currentPath={currentPath} />
          <CompletedTasksCard currentPath={currentPath} />
        </div>
        <UserActivityCard currentPath={currentPath} />
      </div>
    </DashboardLayout>
  );
};

export default Index;
