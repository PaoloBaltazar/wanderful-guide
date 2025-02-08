
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Mail, Phone, MapPin, Calendar, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  username: string | null;
  contact_number: string | null;
  location: string | null;
  role: string;
}

interface NewEmployeeForm {
  email: string;
  password: string;
  full_name: string;
  username: string;
  contact_number: string;
  location: string;
}

interface CreateEmployeeResponse {
  id?: string;
  error?: string;
}

const initialFormState: NewEmployeeForm = {
  email: "",
  password: "",
  full_name: "",
  username: "",
  contact_number: "",
  location: "",
};

const Employees = () => {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<NewEmployeeForm>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
      return;
    }

    setEmployees(data || []);
  };

  const handleDeleteEmployees = async () => {
    if (selectedEmployees.length === 0) {
      setDeleteError("Please select at least one employee to delete");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const { data, error } = await supabase.functions.invoke('delete-users', {
        body: {
          userIds: selectedEmployees,
          adminUsername,
          adminPassword,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete employees');
      }

      toast({
        title: "Success",
        description: `${selectedEmployees.length} employee(s) have been removed`,
      });

      // Reset state and close modal
      setIsDeleteModalOpen(false);
      setSelectedEmployees([]);
      setAdminUsername("");
      setAdminPassword("");
      setDeleteError("");
      
      // Refresh employee list
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employees:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete employees');
      toast({
        title: "Error",
        description: "Failed to delete employees",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddEmployee = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('create_new_employee', {
        employee_email: formData.email,
        employee_password: formData.password,
        employee_full_name: formData.full_name,
        employee_username: formData.username,
        employee_contact: formData.contact_number,
        employee_location: formData.location,
      });

      const response = data as CreateEmployeeResponse;

      if (error || response.error) {
        throw new Error(error?.message || response.error || 'Failed to add employee');
      }

      toast({
        title: "Success",
        description: "Employee has been added successfully",
      });

      setIsAddModalOpen(false);
      setFormData(initialFormState);
      fetchEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add employee",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(employee => 
    employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.username && employee.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Employee Directory</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Manage and view employee information</p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full md:w-auto">
            <Button 
              variant="destructive" 
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full md:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Employees
            </Button>
            <Button 
              className="w-full md:w-auto"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm md:text-base"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="p-4 md:p-6">
              <div className="flex items-start gap-4">
                <img
                  src={employee.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.email}`}
                  alt={employee.full_name}
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full"
                />
                <div className="flex-1 min-w-0 space-y-3 md:space-y-4">
                  <div>
                    <h3 className="font-semibold text-base md:text-lg truncate">{employee.full_name}</h3>
                    {employee.username && (
                      <p className="text-xs md:text-sm text-gray-500 truncate">@{employee.username}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-xs md:text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                    
                    {employee.contact_number && (
                      <div className="flex items-center text-xs md:text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{employee.contact_number}</span>
                      </div>
                    )}
                    
                    {employee.location && (
                      <div className="flex items-center text-xs md:text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{employee.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-xs md:text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">Joined {new Date(employee.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Employees</DialogTitle>
            <DialogDescription>
              Select the employees you want to delete. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4 max-h-[200px] overflow-y-auto">
              {employees.map((employee) => (
                <div key={employee.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={employee.id}
                    checked={selectedEmployees.includes(employee.id)}
                    onCheckedChange={(checked) => {
                      setSelectedEmployees(
                        checked
                          ? [...selectedEmployees, employee.id]
                          : selectedEmployees.filter(id => id !== employee.id)
                      );
                    }}
                  />
                  <label htmlFor={employee.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {employee.full_name}
                  </label>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Admin Username"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Admin Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              {deleteError && (
                <p className="text-sm text-red-500">{deleteError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteModalOpen(false);
              setSelectedEmployees([]);
              setAdminUsername("");
              setAdminPassword("");
              setDeleteError("");
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteEmployees}
              disabled={selectedEmployees.length === 0 || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new employee account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="employee@company.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="johndoe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact_number">Contact Number</Label>
              <Input
                id="contact_number"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleInputChange}
                placeholder="+1234567890"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="New York, USA"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddModalOpen(false);
              setFormData(initialFormState);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddEmployee}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Employees;
