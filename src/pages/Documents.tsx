import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  FileText, 
  Download, 
  File, 
  FileCheck,
  Search,
  Eye,
  Trash2
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useSessionContext } from "@supabase/auth-helpers-react";

interface Document {
  id: string;
  title: string;
  file_type: string;
  file_path: string;
  size: number;
  created_at: string;
  content: string | null;
  created_by: string;
}

const Documents = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const { toast } = useToast();
  const { session } = useSessionContext();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      console.log("Fetching documents...");
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        throw error;
      }

      console.log("Fetched documents:", data);
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !session?.user) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedTypes = ['doc', 'docx', 'pdf', 'jpg', 'jpeg', 'png'];
    
    if (!fileExt || !allowedTypes.includes(fileExt)) {
      toast({
        title: "Error",
        description: "Invalid file type. Only Word documents, PDFs, and images are allowed.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const filePath = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          title: file.name,
          file_path: filePath,
          file_type: fileExt,
          size: file.size,
          created_by: session.user.id
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });

      await fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.title;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Downloaded ${document.title}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleView = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.file_path, 3600);

      if (error) throw error;

      if (['doc', 'docx'].includes(document.file_type)) {
        // Open in Office Online Viewer
        const officeOnlineUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(data.signedUrl)}`;
        window.open(officeOnlineUrl, '_blank');
      } else if (['pdf'].includes(document.file_type)) {
        window.open(data.signedUrl, '_blank');
      } else if (['jpg', 'jpeg', 'png'].includes(document.file_type)) {
        setSelectedDocument({ ...document, content: data.signedUrl });
        setIsViewOpen(true);
      }
    } catch (error) {
      console.error('View error:', error);
      toast({
        title: "Error",
        description: "Failed to view document",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent, document: Document) => {
    e.stopPropagation();
    
    try {
      console.log('Attempting to delete document:', document);
      console.log('Current user:', session?.user?.id);
      console.log('Document created_by:', document.created_by);
      
      // First delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        toast({
          title: "Error",
          description: `Failed to delete file: ${storageError.message}`,
          variant: "destructive",
        });
        return;
      }

      // Then delete the document record from the database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id)
        .eq('created_by', session?.user?.id); // Ensure we're only deleting our own documents

      if (dbError) {
        console.error('Database delete error:', dbError);
        toast({
          title: "Error",
          description: `Failed to delete document record: ${dbError.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

      // Refresh the documents list
      await fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Document Management</h1>
            <p className="text-gray-600 mt-1">Manage and organize company documents</p>
          </div>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              className="hidden"
              id="file-upload"
              onChange={handleFileUpload}
              accept=".doc,.docx,.pdf,.jpg,.jpeg,.png"
            />
            <label htmlFor="file-upload">
              <Button asChild>
                <span>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Document
                </span>
              </Button>
            </label>
          </div>
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-blue-50">
            <FileText className="w-8 h-8 text-primary mb-2" />
            <h3 className="font-semibold">Total Documents</h3>
            <p className="text-2xl font-bold mt-2">{documents.length}</p>
          </Card>
          
          <Card className="p-6 bg-green-50">
            <FileCheck className="w-8 h-8 text-green-600 mb-2" />
            <h3 className="font-semibold">Word Documents</h3>
            <p className="text-2xl font-bold mt-2">
              {documents.filter(d => ['doc', 'docx'].includes(d.file_type)).length}
            </p>
          </Card>
          
          <Card className="p-6 bg-orange-50">
            <File className="w-8 h-8 text-orange-600 mb-2" />
            <h3 className="font-semibold">Other Files</h3>
            <p className="text-2xl font-bold mt-2">
              {documents.filter(d => !['doc', 'docx'].includes(d.file_type)).length}
            </p>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Recent Documents</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search documents..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <FileText className="w-6 h-6 text-gray-400" />
                  <div>
                    <h3 className="font-medium">{doc.title}</h3>
                    <p className="text-sm text-gray-500">
                      {doc.file_type.toUpperCase()} • {formatFileSize(doc.size)} • 
                      Last modified: {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleView(doc)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(e, doc)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.title}</DialogTitle>
          </DialogHeader>
          {selectedDocument?.content && (
            <div className="mt-4">
              <img 
                src={selectedDocument.content} 
                alt={selectedDocument.title}
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Documents;
