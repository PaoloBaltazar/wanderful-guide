
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";
import ConfettiAnimation from "./ConfettiAnimation";
import { useToast } from "@/components/ui/use-toast";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Show welcome message and confetti after a short delay
    const timer = setTimeout(() => {
      setShowConfetti(true);
      toast({
        title: "Welcome to your dashboard!",
        description: "Here's a quick overview of your current metrics.",
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [toast]);

  // Adjust sidebar state when screen size changes
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-background">
      <ConfettiAnimation isActive={showConfetti} duration={4000} />
      
      <DashboardSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className={`transition-all duration-200 ${!isMobile && isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <DashboardHeader toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        
        <main className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
