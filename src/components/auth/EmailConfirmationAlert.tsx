
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface EmailConfirmationAlertProps {
  email: string | null;
  onResend: () => void;
}

export const EmailConfirmationAlert = ({ email, onResend }: EmailConfirmationAlertProps) => {
  if (!email) return null;

  return (
    <Alert variant="destructive" className="mt-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-col space-y-2">
        <p>Please verify your email before signing in.</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onResend}
          className="w-full mt-2"
        >
          Resend Verification Email
        </Button>
      </AlertDescription>
    </Alert>
  );
};
