import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const Settings = () => {
  const { toast } = useToast();
  const { user, refreshSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    username: "",
    position: "",
    birthdate: "",
    address: "",
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    weeklyReports: true,
    taskAssignments: true,
    taskUpdates: true
  });
  
  const [privacySettings, setPrivacySettings] = useState({
    shareData: true,
    dataSaving: false,
    marketing: false
  });

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      const metadata = user.user_metadata || {};
      const nameParts = (metadata.full_name || user.email?.split('@')[0] || "").split(" ");
      
      setProfileData({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: user.email || "",
        phoneNumber: metadata.contact_number || "",
        username: metadata.username || "",
        position: metadata.position || "",
        birthdate: metadata.birthdate || "",
        address: metadata.address || "",
      });

      if (metadata.birthdate) {
        setSelectedDate(new Date(metadata.birthdate));
      }
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      if (!user) throw new Error("User not authenticated");

      const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
      
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          contact_number: profileData.phoneNumber,
          username: profileData.username,
          position: profileData.position,
          birthdate: profileData.birthdate,
          address: profileData.address,
        },
      });
      
      if (error) throw error;
      
      const { error: employeeError } = await supabase
        .from('employees')
        .update({
          name: fullName,
          username: profileData.username,
          position: profileData.position,
          birthdate: profileData.birthdate,
          contact_number: profileData.phoneNumber,
          address: profileData.address,
        })
        .eq('id', user.id);
      
      if (employeeError) {
        console.error("Error updating employee record:", employeeError);
        throw employeeError;
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      
      await refreshSession();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error("New password and confirm password do not match");
      }
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully",
      });
      
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailNotificationChange = (checked: boolean) => {
    setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }));
  };

  const handleSmsNotificationChange = (checked: boolean) => {
    setNotificationSettings(prev => ({ ...prev, smsNotifications: checked }));
  };

  const handlePrivacyChange = (setting: string, checked: boolean) => {
    setPrivacySettings(prev => ({ ...prev, [setting]: checked }));
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      if (!user) throw new Error("User not authenticated");
      
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      await supabase.functions.invoke('delete-user', {
        body: { userId: user.id }
      });
      
      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted.",
      });
      
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");
      setProfileData(prev => ({ ...prev, birthdate: formattedDate }));
    } else {
      setProfileData(prev => ({ ...prev, birthdate: "" }));
    }
    setCalendarOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and settings</p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input 
                type="text" 
                id="firstName" 
                value={profileData.firstName}
                onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input 
                type="text" 
                id="lastName" 
                value={profileData.lastName}
                onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              type="email" 
              id="email" 
              value={profileData.email} 
              disabled 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input 
                type="text" 
                id="username" 
                value={profileData.username}
                onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="position">Position/Role</Label>
              <Input 
                type="text" 
                id="position" 
                value={profileData.position}
                onChange={(e) => setProfileData(prev => ({ ...prev, position: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input 
              type="tel" 
              id="phoneNumber" 
              value={profileData.phoneNumber}
              onChange={(e) => setProfileData(prev => ({ ...prev, phoneNumber: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="birthdate">Birthdate</Label>
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
                  {selectedDate ? format(selectedDate, "PPP") : <span>Select birthdate</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  footer={
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                      <button 
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => handleDateSelect(undefined)}
                      >
                        Clear
                      </button>
                      <button 
                        className="text-sm font-medium text-primary hover:underline transition-colors"
                        onClick={() => handleDateSelect(new Date())}
                      >
                        Today
                      </button>
                    </div>
                  }
                />
              </PopoverContent>
            </Popover>
            <input
              type="hidden"
              id="birthdate"
              name="birthdate"
              value={profileData.birthdate}
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea 
              id="address" 
              value={profileData.address}
              onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
              className="resize-none"
              rows={3}
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={loading}>
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              type="password"
              id="currentPassword"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              type="password"
              id="newPassword"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              type="password"
              id="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </div>
          <Button onClick={handleChangePassword} disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </CardContent>
      </Card>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="emailNotifications">Email Notifications</Label>
            <Switch 
              id="emailNotifications" 
              checked={notificationSettings.emailNotifications}
              onCheckedChange={handleEmailNotificationChange}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="smsNotifications">SMS Notifications</Label>
            <Switch 
              id="smsNotifications"
              checked={notificationSettings.smsNotifications}
              onCheckedChange={handleSmsNotificationChange}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="pushNotifications">Push Notifications</Label>
            <Switch 
              id="pushNotifications" 
              checked={notificationSettings.pushNotifications}
              onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, pushNotifications: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="weeklyReports">Weekly Reports</Label>
            <Switch 
              id="weeklyReports" 
              checked={notificationSettings.weeklyReports}
              onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, weeklyReports: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="taskAssignments">Task Assignments</Label>
            <Switch 
              id="taskAssignments" 
              checked={notificationSettings.taskAssignments}
              onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, taskAssignments: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="taskUpdates">Task Updates</Label>
            <Switch 
              id="taskUpdates" 
              checked={notificationSettings.taskUpdates}
              onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, taskUpdates: checked }))}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Privacy & Data</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="shareData">Share Data</Label>
            <Switch 
              id="shareData" 
              checked={privacySettings.shareData}
              onCheckedChange={(checked) => handlePrivacyChange("shareData", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="dataSaving">Data Saving</Label>
            <Switch 
              id="dataSaving" 
              checked={privacySettings.dataSaving}
              onCheckedChange={(checked) => handlePrivacyChange("dataSaving", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="marketing">Marketing</Label>
            <Switch 
              id="marketing" 
              checked={privacySettings.marketing}
              onCheckedChange={(checked) => handlePrivacyChange("marketing", checked)}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Be careful, these actions are irreversible.
          </p>
          <Button variant="destructive" onClick={handleDeleteAccount} disabled={loading}>
            {loading ? "Deleting..." : "Delete Account"}
          </Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Settings;
