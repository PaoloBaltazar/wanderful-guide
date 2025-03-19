
import { useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import CreateTaskForm from "@/components/CreateTaskForm";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const CreateTask = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Log the location state when the component mounts
  useEffect(() => {
    if (location.state?.dueDate) {
      console.log("CreateTask received date:", location.state.dueDate);
    }
  }, [location.state]);
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Create HR Task</h1>
        <p className="text-muted-foreground">
          {location.state?.dueDate 
            ? `Creating task for ${new Date(location.state.dueDate).toLocaleDateString()}`
            : 'Add a new task to the HR department'}
        </p>
        {user && (
          <p className="text-sm text-muted-foreground mt-1">
            Creating task as: {user.email}
          </p>
        )}
      </div>
      
      <CreateTaskForm initialDueDate={location.state?.dueDate} />
    </DashboardLayout>
  );
};

export default CreateTask;
