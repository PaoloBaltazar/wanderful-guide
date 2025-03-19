import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, UserRound, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import EmployeeViewDialog from "@/components/EmployeeViewDialog";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

const Employees = () => {
  const { toast } = useToast();
  const { user, deleteUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [employeeToView, setEmployeeToView] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      console.log("Fetching employees from database...");
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching employees:", error);
        throw error;
      }
      
      const validEmployees = data || [];
      console.log("Fetched employees:", validEmployees);
      
      setEmployees(validEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: `Failed to fetch employees: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Employees component mounted, fetching data...");
    fetchEmployees();
    
    const employeesChannel = supabase
      .channel('employees-changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'employees' }, 
          (payload) => {
            console.log("Real-time update received:", payload);
            fetchEmployees();
      })
      .subscribe((status) => {
        console.log("Supabase channel status:", status);
      });

    return () => {
      console.log("Unsubscribing from employees channel");
      supabase.removeChannel(employeesChannel);
    };
  }, []);

  const handleRefresh = () => {
    console.log("Manual refresh requested");
    fetchEmployees();
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      console.log("Deleting employee with ID:", employeeId);
      
      await deleteUser(employeeId);
      
      setEmployees(employees.filter(emp => emp.id !== employeeId));
      
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee",
        variant: "destructive"
      });
    } finally {
      setEmployeeToDelete(null);
    }
  };

  const handleViewEmployee = (employeeId: string) => {
    setEmployeeToView(employeeId);
    setIsViewDialogOpen(true);
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || employee.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const roles = [...new Set(employees.map(employee => employee.role))];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-muted-foreground">View and manage HR department employees and authenticated users</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Search employees by name or email..."
                className="pl-9 pr-4 py-2 w-full rounded-md border border-input bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center border rounded-md overflow-hidden">
                <span className="px-3 bg-secondary py-2 text-sm font-medium">Role</span>
                <select
                  className="py-2 px-3 border-l bg-white"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Registered Employees</CardTitle>
          <div className="text-sm text-muted-foreground">
            {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading employees...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-4">
              {searchTerm || roleFilter !== 'all'
                ? "No employees match your search criteria." 
                : "No registered employees available yet. Users who sign up will automatically appear here."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map(employee => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserRound className="h-5 w-5 text-primary" />
                          <span>{employee.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          {employee.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(employee.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewEmployee(employee.id)}
                          >
                            View
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {employee.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDeleteEmployee(employee.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeViewDialog 
        employeeId={employeeToView} 
        isOpen={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
      />
    </DashboardLayout>
  );
};

export default Employees;
