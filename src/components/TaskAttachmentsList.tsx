
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Image, Download, Eye, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface TaskAttachmentsListProps {
  taskId: string;
  refreshTrigger?: number;
}

const TaskAttachmentsList = ({ taskId, refreshTrigger }: TaskAttachmentsListProps) => {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    fetchAttachments();
    
    const subscription = supabase
      .channel('task-attachments-changes')
      .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'task_attachments', filter: `task_id=eq.${taskId}` }, 
          (payload) => {
            console.log('New attachment added:', payload);
            setAttachments(prev => [payload.new as TaskAttachment, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [taskId, refreshTrigger]);

  const fetchAttachments = async () => {
    setLoading(true);
    try {
      console.log('Fetching attachments for task:', taskId);
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching attachments:', error);
        throw error;
      }
      
      console.log('Fetched attachments:', data);
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      toast({
        title: "Error",
        description: "Failed to load attachments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType && fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handlePreviewClick = (attachment: TaskAttachment) => {
    setPreviewAttachment(attachment);
    setIsPreviewOpen(true);
  };

  const isPreviewableInBrowser = (fileType: string) => {
    const previewableTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
      'application/pdf',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/html', 'text/csv'
    ];
    
    return previewableTypes.includes(fileType);
  };

  const handleDownloadClick = (attachment: TaskAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.file_path;
    link.download = attachment.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download started",
      description: `${attachment.file_name} is being downloaded`,
    });
  };

  const renderPreviewContent = () => {
    if (!previewAttachment) return null;

    if (previewAttachment.file_type.startsWith('image/')) {
      return (
        <img 
          src={previewAttachment.file_path} 
          alt={previewAttachment.file_name} 
          className="max-w-full max-h-[70vh] object-contain" 
        />
      );
    }
    
    if (previewAttachment.file_type === 'application/pdf') {
      return (
        <iframe 
          src={previewAttachment.file_path} 
          title={previewAttachment.file_name} 
          className="w-full h-[70vh]" 
        />
      );
    }
    
    if (
      previewAttachment.file_type.includes('excel') ||
      previewAttachment.file_type.includes('word') ||
      previewAttachment.file_type.includes('powerpoint') ||
      previewAttachment.file_type.includes('officedocument')
    ) {
      const encodedUrl = encodeURIComponent(previewAttachment.file_path);
      const googleViewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
      
      return (
        <div className="w-full h-[70vh]">
          <iframe 
            src={googleViewerUrl} 
            title={previewAttachment.file_name} 
            className="w-full h-full border-0" 
          />
          <div className="text-center mt-2 text-sm text-muted-foreground">
            <p>If the document doesn't load properly, you can:</p>
            <div className="flex justify-center gap-3 mt-1">
              <a
                href={previewAttachment.file_path}
                download
                className="text-primary hover:underline"
              >
                Download
              </a>
              <span>or</span>
              <a
                href={previewAttachment.file_path}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Open in new tab
              </a>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="text-center p-8">
        <p className="mb-4">This file type ({previewAttachment.file_type}) cannot be previewed directly in the browser.</p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => window.open(previewAttachment.file_path, '_blank')}>
            <Eye className="mr-2 h-4 w-4" /> Open in new tab
          </Button>
          <Button variant="outline" onClick={() => {
            const link = document.createElement('a');
            link.href = previewAttachment.file_path;
            link.download = previewAttachment.file_name;
            link.click();
          }}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Loading attachments...
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No attachments
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {attachments.map(attachment => (
        <div key={attachment.id} className="flex items-center justify-between border rounded-md p-2">
          <div className="flex items-center gap-2 overflow-hidden">
            {getFileIcon(attachment.file_type)}
            <div>
              <div className="font-medium text-sm truncate">{attachment.file_name}</div>
              <div className="text-xs text-muted-foreground">
                {formatFileSize(attachment.file_size)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">View</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="end">
                <div className="grid gap-1 p-2">
                  <Button 
                    variant="ghost" 
                    className="justify-start" 
                    onClick={() => handlePreviewClick(attachment)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="justify-start"
                    onClick={() => window.open(attachment.file_path, '_blank')}
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    Open in new tab
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0"
              onClick={() => handleDownloadClick(attachment)}
            >
              <Download className="h-4 w-4" />
              <span className="sr-only">Download</span>
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewAttachment?.file_name}</DialogTitle>
            <DialogDescription>
              {previewAttachment && (
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(previewAttachment.file_size)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            {renderPreviewContent()}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {previewAttachment && (
              <Button
                variant="outline"
                onClick={() => handleDownloadClick(previewAttachment)}
              >
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            )}
            <Button onClick={() => setIsPreviewOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskAttachmentsList;
