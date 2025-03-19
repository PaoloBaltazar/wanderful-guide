
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NotificationDeleteDialogProps {
  notificationId: string;
  isOpen: boolean;
  onClose: () => void;
  afterDelete: () => void;
}

const NotificationDeleteDialog = ({ 
  notificationId, 
  isOpen, 
  onClose, 
  afterDelete 
}: NotificationDeleteDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      // Delete the notification
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) {
        console.error("Error deleting notification:", error);
        throw error;
      }
      
      toast({
        title: "Notification deleted",
        description: "The notification has been deleted successfully."
      });
      
      onClose();
      afterDelete();
    } catch (error) {
      console.error("Error in delete operation:", error);
      toast({
        title: "Error",
        description: "Failed to delete the notification. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Notification
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this notification? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Notification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationDeleteDialog;
