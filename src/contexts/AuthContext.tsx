import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from "react";
import { supabase, deleteUserFromAuth } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteUser: (userId?: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", session ? "Authenticated" : "Not authenticated");
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        syncUserToEmployees(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state change event:", event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session?.user) {
          syncUserToEmployees(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);
  
  const syncUserToEmployees = async (user: User) => {
    try {
      console.log("Syncing user to employees table:", user.id);
      
      const { data: existingEmployee, error: checkError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
        
      if (checkError) {
        console.error("Error checking employee existence:", checkError);
        return;
      }
      
      if (!existingEmployee) {
        console.log("Employee record not found for user, creating new employee record");
        
        const userData = user.user_metadata || {};
        const employeeData = {
          id: user.id,
          name: userData.full_name || user.email?.split('@')[0] || 'Unknown',
          email: user.email || '',
          role: userData.position || 'Staff'
        };
        
        console.log("Creating employee with data:", employeeData);
        
        const { data: newEmployee, error: insertError } = await supabase
          .from('employees')
          .insert([employeeData])
          .select()
          .single();
          
        if (insertError) {
          console.error("Error creating employee record:", insertError);
        } else {
          console.log("Successfully created employee record:", newEmployee);
        }
      } else {
        console.log("Employee record already exists:", existingEmployee);
      }
    } catch (error) {
      console.error("Error syncing user to employees:", error);
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      console.log("Signing up with data:", { email, userData });
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      
      console.log("Signup successful, auth data:", data);
      
      if (!data.user) {
        console.warn("No user data returned from signup");
        toast({
          title: "Verification email sent",
          description: "Please check your email to verify your account",
        });
        return;
      }
      
      console.log("Creating employee record for new signup");
      const newEmployeeRecord = {
        id: data.user.id,
        name: userData.full_name || email.split('@')[0],
        email: email,
        role: userData.position || 'Staff'
      };
      
      console.log("Employee data to insert:", newEmployeeRecord);
      
      const { data: insertedEmployee, error: employeeError } = await supabase
        .from('employees')
        .insert([newEmployeeRecord])
        .select();
      
      if (employeeError) {
        console.error("Error adding to employees:", employeeError);
      } else {
        console.log("Successfully added to employees table:", insertedEmployee);
      }
      
      toast({
        title: "Verification email sent",
        description: "Please check your email to verify your account",
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Signed in successfully",
        description: "Welcome back!",
      });
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Signed out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      setSession(data.session);
      setUser(data.session?.user ?? null);
      
      toast({
        title: "Session refreshed",
        description: "Your session has been refreshed successfully",
      });
    } catch (error: any) {
      console.error("Error refreshing session:", error);
      toast({
        title: "Error refreshing session",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId?: string) => {
    try {
      const userIdToDelete = userId || user?.id;
      
      if (!userIdToDelete) {
        toast({
          title: "Error",
          description: "No user found to delete",
          variant: "destructive",
        });
        return;
      }
      
      console.log("Attempting to delete user with ID:", userIdToDelete);
      
      // First delete from employees table
      const { error: employeeError } = await supabase
        .from('employees')
        .delete()
        .eq('id', userIdToDelete);
        
      if (employeeError) {
        console.error("Error deleting user from employees table:", employeeError);
        throw employeeError;
      }
      
      console.log("Successfully deleted user from employees table");
      
      // Then delete from auth system using our edge function
      await deleteUserFromAuth(userIdToDelete);
      
      console.log("Successfully deleted user from auth system");
      
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      
      return;
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error deleting user",
        description: error.message || "An unknown error occurred while deleting the user",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signUp,
        signIn,
        signOut,
        deleteUser,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
