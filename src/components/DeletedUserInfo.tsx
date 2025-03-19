
import { AlertTriangle } from "lucide-react";

interface DeletedUserInfoProps {
  message?: string;
  showIcon?: boolean;
  className?: string;
}

const DeletedUserInfo = ({
  message = "This information is no longer available as the user has been deleted",
  showIcon = true,
  className = "",
}: DeletedUserInfoProps) => {
  return (
    <div className={`flex items-center p-2 text-sm text-muted-foreground bg-muted/50 rounded-md ${className}`}>
      {showIcon && <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />}
      <span>{message}</span>
    </div>
  );
};

export default DeletedUserInfo;
