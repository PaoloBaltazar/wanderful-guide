
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Paperclip, FileText, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface FileAttachment {
  name: string;
  size: number;
  type: string;
  file: File;
}

interface TaskFileUploaderProps {
  taskId?: string; 
  onFileUpload: (fileData: any) => void;
}

const TaskFileUploader = ({ taskId, onFileUpload }: TaskFileUploaderProps) => {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    // Reset the input
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Function to generate a unique filename by adding a suffix like (1) if needed
  const generateUniqueFileName = async (originalName: string, bucket: string) => {
    // Extract file name and extension
    const lastDotIndex = originalName.lastIndexOf('.');
    const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
    const extension = lastDotIndex !== -1 ? originalName.substring(lastDotIndex) : '';
    
    // Check if file exists
    const { data: existingFiles } = await supabase.storage
      .from(bucket)
      .list(user?.id || 'anonymous', {
        search: baseName
      });
    
    if (!existingFiles || existingFiles.length === 0) {
      return originalName; // No duplicates found
    }
    
    // Filter files with the same base name
    const matchingFiles = existingFiles.filter(file => 
      file.name.startsWith(baseName) && file.name.endsWith(extension)
    );
    
    if (matchingFiles.length === 0) {
      return originalName; // No matching files found
    }
    
    // Find the highest number suffix
    let highestSuffix = 0;
    const suffixRegex = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\((\\d+)\\)${extension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    
    matchingFiles.forEach(file => {
      const match = file.name.match(suffixRegex);
      if (match && match[1]) {
        const suffix = parseInt(match[1], 10);
        if (suffix > highestSuffix) {
          highestSuffix = suffix;
        }
      }
    });
    
    // Generate new filename with incremented suffix
    return `${baseName} (${highestSuffix + 1})${extension}`;
  };

  const uploadFiles = async () => {
    if (attachments.length === 0) return;
    
    setUploading(true);
    const uploadedFiles = [];

    try {
      for (const attachment of attachments) {
        // Generate a unique file name if needed
        const userId = user?.id || 'anonymous';
        const timestamp = new Date().getTime();
        const fileName = await generateUniqueFileName(attachment.name, 'task-attachments');
        const filePath = `${userId}/${timestamp}_${fileName}`;
        
        console.log(`Uploading file to path: ${filePath}`);
        
        // Upload file to Supabase Storage
        const { data: fileData, error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(filePath, attachment.file);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        console.log('File uploaded successfully:', fileData);

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('task-attachments')
          .getPublicUrl(filePath);
          
        const fileRecord = {
          file_name: fileName,
          file_path: publicUrlData.publicUrl,
          file_type: attachment.type,
          file_size: attachment.size,
          task_id: taskId
        };
        
        uploadedFiles.push(fileRecord);
      }

      onFileUpload(uploadedFiles);
      setAttachments([]);
      toast({
        title: "Files uploaded successfully",
        description: `${uploadedFiles.length} file(s) attached to the task`,
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your files",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          asChild
        >
          <label>
            <Paperclip className="h-4 w-4" />
            Attach Files
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </Button>
        
        {attachments.length > 0 && (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="flex items-center gap-2"
            onClick={uploadFiles}
            disabled={uploading}
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Files"}
          </Button>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2 border rounded-md p-3 bg-background/50">
          <h4 className="text-sm font-medium">Selected Files</h4>
          <ul className="space-y-2">
            {attachments.map((file, index) => (
              <li key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                  {getFileIcon(file.type)}
                  <span className="truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TaskFileUploader;
