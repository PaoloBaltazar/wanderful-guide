
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { session } = useSessionContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUserRole = async () => {
      if (!session?.user) {
        if (location.pathname !== "/login" && 
            location.pathname !== "/success-confirmation" &&
            location.pathname !== "/unauthorized") {
          navigate("/login");
        }
        return;
      }

      // Check if the user has admin role for /employees page
      if (location.pathname === "/employees") {
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (!userRole || userRole.role !== 'admin') {
          toast({
            title: "Unauthorized",
            description: "Only administrators can access the employee management page.",
            variant: "destructive",
          });
          navigate("/unauthorized");
        }
      }
    };

    checkUserRole();
  }, [session, navigate, location.pathname, toast]);

  // Don't show navbar on login, success confirmation, or unauthorized pages
  if (location.pathname === "/login" || 
      location.pathname === "/success-confirmation" ||
      location.pathname === "/unauthorized") {
    return (
      <div className="flex min-h-screen w-full bg-gray-100 dark:bg-gray-900">
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto container py-4">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden w-full pt-14">
        <main className="flex-1 overflow-y-auto container py-4">
          {children}
        </main>
      </div>
    </div>
  );
};
