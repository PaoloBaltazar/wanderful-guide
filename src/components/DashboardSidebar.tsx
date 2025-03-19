import { cn } from "@/lib/utils";
import { LayoutDashboard, BarChart3, Users, Settings, LogOut, PlusCircle, CheckSquare, Bell, Calendar, FileText, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  active?: boolean;
  onClick?: () => void;
}
interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}
const NavItem = ({
  icon,
  label,
  to,
  active = false,
  onClick
}: NavItemProps) => <Link to={to} className="w-full">
    <button onClick={onClick} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm w-full transition-all duration-200", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
      <div>{icon}</div>
      <span>{label}</span>
    </button>
  </Link>;
const DashboardSidebar = ({
  isOpen,
  onClose
}: DashboardSidebarProps) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const currentPath = location.pathname;
  const {
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };
  return <>
      {/* Backdrop for mobile */}
      {isMobile && isOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={onClose} />}
      
      <aside className={cn("fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-border bg-card transition-transform duration-300 ease-bounce-in", isOpen ? "translate-x-0" : "-translate-x-full", !isMobile && "translate-x-0")}>
        <div className="flex flex-col h-full">
          <div className="flex h-16 items-center gap-2 border-b border-border px-6">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10">
                <img src="/lovable-uploads/14dab305-1720-4cc6-bedd-461a5855e42e.png" alt="CIAC Logo" className="h-full w-full object-contain" />
              </div>
              <span className="tracking-tight text-base font-semibold">CIAC HR</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-1">
              <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" to="/" active={currentPath === "/"} />
              <NavItem icon={<CheckSquare size={18} />} label="Tasks" to="/tasks" active={currentPath === "/tasks"} />
              <NavItem icon={<Bell size={18} />} label="Notifications" to="/notifications" active={currentPath === "/notifications"} />
              <NavItem icon={<Calendar size={18} />} label="Calendar" to="/calendar" active={currentPath === "/calendar"} />
              <NavItem icon={<FileText size={18} />} label="Documents" to="/documents" active={currentPath === "/documents"} />
              <NavItem icon={<UserRound size={18} />} label="Employees" to="/employees" active={currentPath === "/employees"} />
              <NavItem icon={<Settings size={18} />} label="Settings" to="/settings" active={currentPath === "/settings"} />
            </div>
          </div>
          
          <div className="border-t border-border p-4">
            <button onClick={handleLogout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm w-full transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>;
};
export default DashboardSidebar;