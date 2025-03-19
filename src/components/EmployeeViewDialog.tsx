
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { UserRound } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  // Additional fields from user metadata
  address?: string;
  contact_number?: string;
  birthdate?: string;
  username?: string;
  position?: string;
}

interface EmployeeViewDialogProps {
  employeeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const EmployeeViewDialog = ({ 
  employeeId, 
  isOpen, 
  onClose
}: EmployeeViewDialogProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      if (!employeeId) return;
      
      try {
        setIsLoading(true);
        
        // First fetch basic employee info
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('id', employeeId)
          .single();
        
        if (employeeError) {
          console.error("Error fetching employee details:", employeeError);
          throw employeeError;
        }
        
        console.log("Fetched employee details:", employeeData);
        
        // Then fetch the user metadata to get additional details
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(employeeId);
        
        if (userError) {
          // If we can't get the user data, just use what we have from employees table
          console.error("Error fetching user metadata:", userError);
          setEmployee(employeeData);
        } else {
          // Combine data from both sources
          console.log("Fetched user metadata:", userData);
          const userMetadata = userData.user.user_metadata || {};
          
          setEmployee({
            ...employeeData,
            address: userMetadata.address,
            contact_number: userMetadata.contact_number,
            birthdate: userMetadata.birthdate,
            username: userMetadata.username,
            position: userMetadata.position || employeeData.role,
          });
        }
      } catch (error: any) {
        console.error('Error fetching employee details:', error);
        toast({
          title: "Error",
          description: `Failed to fetch employee details: ${error.message || 'Unknown error'}`,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && employeeId) {
      fetchEmployeeDetails();
    }
  }, [employeeId, isOpen, toast]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not provided";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
          <DialogDescription>
            Detailed information about this employee.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : employee ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center mb-4">
              <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
                <UserRound className="h-10 w-10 text-secondary-foreground" />
              </div>
            </div>
            
            <div className="grid gap-4">
              <div>
                <h3 className="text-lg font-medium text-center">{employee.name}</h3>
                <p className="text-sm text-muted-foreground text-center">{employee.email}</p>
                {employee.username && (
                  <p className="text-xs text-muted-foreground text-center">@{employee.username}</p>
                )}
              </div>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <span className="font-medium">
                        <span className="inline-block px-2 py-1 rounded-full text-xs bg-secondary">
                          {employee.position || employee.role}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registration Date:</span>
                      <span className="font-medium">{formatDate(employee.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Employee ID:</span>
                      <span className="font-medium text-xs text-muted-foreground">{employee.id}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Additional information section - always show this section now */}
              <Separator />
              <Card>
                <CardContent className="pt-6">
                  <h4 className="text-sm font-medium mb-3">Additional Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contact Number:</span>
                      <span className="font-medium">{employee.contact_number || "Not provided"}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Birthdate:</span>
                      <span className="font-medium">{employee.birthdate ? formatDate(employee.birthdate) : "Not provided"}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="font-medium">{employee.address || "Not provided"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            Employee not found or has been deleted.
          </div>
        )}
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeViewDialog;
