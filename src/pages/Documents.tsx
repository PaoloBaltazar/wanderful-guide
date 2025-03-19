
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Image as ImageIcon, 
  Upload, 
  Eye,
  Search,
  Trash2,
  X,
  History,
  ArrowLeft,
  File,
  FileImage,
  FileText as PdfIcon,
  FileSpreadsheet,
  FileCode,
  FileAudio,
  FileVideo,
  FileType
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";

type FilterType = 'all' | 'documents' | 'images' | 'other';

interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  created_at: string;
  url: string;
  version?: number;
}

type DocumentVersion = Document;

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  } catch (e) {
    return 'Invalid date';
  }
};

const getFileIcon = (fileType: string) => {
  if (fileType.includes('image')) {
    return <FileImage className="h-5 w-5 text-purple-600" />;
  } else if (fileType.includes('pdf')) {
    return <PdfIcon className="h-5 w-5 text-red-600" />;
  } else if (fileType.includes('word') || fileType.includes('document')) {
    return <FileText className="h-5 w-5 text-blue-600" />;
  } else if (fileType.includes('sheet') || fileType.includes('excel')) {
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  } else if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
    return <FileText className="h-5 w-5 text-orange-600" />;
  } else if (fileType.includes('audio')) {
    return <FileAudio className="h-5 w-5 text-yellow-600" />;
  } else if (fileType.includes('video')) {
    return <FileVideo className="h-5 w-5 text-purple-600" />;
  } else if (fileType.includes('code') || fileType.includes('json') || fileType.includes('html') || fileType.includes('css') || fileType.includes('javascript')) {
    return <FileCode className="h-5 w-5 text-gray-600" />;
  } else {
    return <FileType className="h-5 w-5 text-gray-600" />;
  }
};

const Documents = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({
    documents: 0,
    images: 0,
    other: 0
  });
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>([]);
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  
  const getBaseDocumentName = (fileName: string): string => {
    return fileName.replace(/_v\d+(\.\w+)$/, '$1');
  };
  
  const getVersionFromFileName = (fileName: string): number => {
    const match = fileName.match(/_v(\d+)/);
    return match ? parseInt(match[1]) : 1;
  };
  
  const groupDocumentsByName = (docs: Document[]): Map<string, Document[]> => {
    const groupedDocs = new Map<string, Document[]>();
    
    docs.forEach(doc => {
      const baseName = getBaseDocumentName(doc.name);
      if (!groupedDocs.has(baseName)) {
        groupedDocs.set(baseName, []);
      }
      groupedDocs.get(baseName)?.push({
        ...doc,
        version: getVersionFromFileName(doc.name)
      });
    });
    
    groupedDocs.forEach((versions, baseName) => {
      versions.sort((a, b) => (b.version || 1) - (a.version || 1));
    });
    
    return groupedDocs;
  };
  
  const getLatestVersions = (groupedDocs: Map<string, Document[]>): Document[] => {
    const latestVersions: Document[] = [];
    
    groupedDocs.forEach((versions) => {
      if (versions.length > 0) {
        latestVersions.push(versions[0]);
      }
    });
    
    return latestVersions;
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .storage
        .from('documents')
        .list();

      if (error) {
        console.error('Error fetching documents:', error);
        toast({
          title: "Error fetching documents",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      if (data) {
        const files = data.filter(item => !item.id.endsWith('/'));
        
        const docsWithUrls = await Promise.all(
          files.map(async (file) => {
            const { data: urlData } = await supabase
              .storage
              .from('documents')
              .createSignedUrl(file.name, 3600);
            
            return {
              id: file.id,
              name: file.name,
              size: file.metadata?.size || 0,
              type: file.metadata?.mimetype || 'application/octet-stream',
              created_at: file.created_at,
              url: urlData?.signedUrl || '',
              version: getVersionFromFileName(file.name)
            };
          })
        );

        const groupedDocs = groupDocumentsByName(docsWithUrls);
        const latestVersions = getLatestVersions(groupedDocs);
        
        setDocuments(latestVersions);
        
        const newStats = {
          documents: 0,
          images: 0,
          other: 0
        };
        
        latestVersions.forEach(doc => {
          if (doc.type.includes('image')) {
            newStats.images++;
          } else if (doc.type.includes('pdf') || doc.type.includes('word') || doc.type.includes('document')) {
            newStats.documents++;
          } else {
            newStats.other++;
          }
        });
        
        setStats(newStats);
      }
    } catch (error) {
      console.error('Error in fetchDocuments:', error);
      toast({
        title: "An unexpected error occurred",
        description: "Could not fetch your documents",
        variant: "destructive"
      });
    }
  };

  const fetchDocumentVersions = async (baseDocName: string) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('documents')
        .list();

      if (error) {
        throw error;
      }

      if (data) {
        const baseNameWithoutExt = baseDocName.split('.').slice(0, -1).join('.');
        const extension = baseDocName.split('.').pop() || '';
        const versionFiles = data.filter(file => 
          file.name === baseDocName || 
          file.name.match(new RegExp(`^${baseNameWithoutExt}_v\\d+\\.${extension}$`))
        );
        
        const versionsWithUrls = await Promise.all(
          versionFiles.map(async (file) => {
            const { data: urlData } = await supabase
              .storage
              .from('documents')
              .createSignedUrl(file.name, 3600);
            
            return {
              id: file.id,
              name: file.name,
              size: file.metadata?.size || 0,
              type: file.metadata?.mimetype || 'application/octet-stream',
              created_at: file.created_at,
              url: urlData?.signedUrl || '',
              version: getVersionFromFileName(file.name)
            };
          })
        );
        
        const sortedVersions = versionsWithUrls.sort((a, b) => 
          (b.version || 1) - (a.version || 1)
        );
        
        setDocumentVersions(sortedVersions);
        return sortedVersions;
      }
    } catch (error) {
      console.error('Error fetching document versions:', error);
      toast({
        title: "Error",
        description: "Could not fetch document versions",
        variant: "destructive"
      });
    }
    
    return [];
  };

  const viewVersionHistory = async (doc: Document) => {
    const baseDocName = getBaseDocumentName(doc.name);
    setActiveDocument(baseDocName);
    
    const versions = await fetchDocumentVersions(baseDocName);
    if (versions && versions.length > 0) {
      setIsVersionHistoryOpen(true);
    } else {
      toast({
        title: "No version history",
        description: "This document has no previous versions",
      });
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;
        
        const { data: existingFiles } = await supabase
          .storage
          .from('documents')
          .list();
          
        const baseFileName = fileName.split('.').slice(0, -1).join('.');
        const extension = fileName.split('.').pop() || '';
        
        const matchingFiles = existingFiles?.filter(f => 
          f.name === fileName || 
          f.name.match(new RegExp(`^${baseFileName}_v\\d+\\.${extension}$`))
        ) || [];
        
        if (matchingFiles.length > 0) {
          const highestVersion = matchingFiles.reduce((max, f) => {
            const versionMatch = f.name.match(/_v(\d+)/);
            const version = versionMatch ? parseInt(versionMatch[1]) : 0;
            return Math.max(max, version);
          }, 0);
          
          const newVersion = highestVersion + 1;
          const versionedFileName = `${baseFileName}_v${newVersion}.${extension}`;
          
          const { error } = await supabase
            .storage
            .from('documents')
            .upload(versionedFileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) {
            toast({
              title: "Upload failed",
              description: `Could not upload ${fileName}: ${error.message}`,
              variant: "destructive"
            });
          } else {
            toast({
              title: "New version created",
              description: `Version ${newVersion} of ${fileName} created successfully`,
            });
          }
        } else {
          const { error } = await supabase
            .storage
            .from('documents')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (error) {
            toast({
              title: "Upload failed",
              description: `Could not upload ${fileName}: ${error.message}`,
              variant: "destructive"
            });
          }
        }
      }
      
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload error",
        description: "An unexpected error occurred during upload",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = (doc: Document) => {
    if (doc.url) {
      const a = document.createElement('a');
      a.href = doc.url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: `${doc.name} is being downloaded`,
      });
    } else {
      toast({
        title: "Download error",
        description: "Could not download this file",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      const { error } = await supabase
        .storage
        .from('documents')
        .remove([fileName]);

      if (error) {
        throw error;
      }

      toast({
        title: "File deleted",
        description: `${fileName} has been deleted`,
      });
      
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete error",
        description: "Could not delete this file",
        variant: "destructive"
      });
    }
  };

  const handleView = (doc: Document) => {
    setViewingDocument(doc);
    setIsViewOpen(true);
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  const renderDocumentViewer = () => {
    if (!viewingDocument) return null;

    if (viewingDocument.type.includes('image')) {
      return (
        <img 
          src={viewingDocument.url} 
          alt={viewingDocument.name} 
          className="max-w-full max-h-[70vh] object-contain" 
        />
      );
    } else if (viewingDocument.type.includes('pdf')) {
      return (
        <iframe 
          src={viewingDocument.url} 
          title={viewingDocument.name} 
          className="w-full h-[70vh]" 
        />
      );
    } else if (viewingDocument.type.includes('video')) {
      return (
        <video 
          src={viewingDocument.url} 
          controls 
          className="max-w-full max-h-[70vh]" 
        />
      );
    } else if (viewingDocument.type.includes('audio')) {
      return (
        <audio 
          src={viewingDocument.url} 
          controls 
          className="w-full" 
        />
      );
    } else {
      return (
        <div className="text-center p-8">
          <p className="mb-4">This file type cannot be previewed directly.</p>
        </div>
      );
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (!doc.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    switch (activeFilter) {
      case 'documents':
        return doc.type.includes('pdf') || 
               doc.type.includes('word') || 
               doc.type.includes('document') ||
               doc.type.includes('sheet') || 
               doc.type.includes('excel') ||
               doc.type.includes('presentation') || 
               doc.type.includes('powerpoint');
      case 'images':
        return doc.type.includes('image');
      case 'other':
        return !(
          doc.type.includes('image') || 
          doc.type.includes('pdf') || 
          doc.type.includes('word') || 
          doc.type.includes('document') ||
          doc.type.includes('sheet') || 
          doc.type.includes('excel') ||
          doc.type.includes('presentation') || 
          doc.type.includes('powerpoint')
        );
      case 'all':
      default:
        return true;
    }
  });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-muted-foreground">Manage and share your files with version control</p>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            multiple
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" /> 
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card 
          className={`bg-blue-50 cursor-pointer transition-all hover:shadow-md ${activeFilter === 'documents' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => handleFilterChange(activeFilter === 'documents' ? 'all' : 'documents')}
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="rounded-full bg-blue-100 p-3 mb-3">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold">Documents</h3>
            <p className="text-sm text-muted-foreground">{stats.documents} files</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`bg-purple-50 cursor-pointer transition-all hover:shadow-md ${activeFilter === 'images' ? 'ring-2 ring-purple-500' : ''}`}
          onClick={() => handleFilterChange(activeFilter === 'images' ? 'all' : 'images')}
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="rounded-full bg-purple-100 p-3 mb-3">
              <ImageIcon className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold">Images</h3>
            <p className="text-sm text-muted-foreground">{stats.images} files</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`bg-yellow-50 cursor-pointer transition-all hover:shadow-md ${activeFilter === 'other' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => handleFilterChange(activeFilter === 'other' ? 'all' : 'other')}
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="rounded-full bg-yellow-100 p-3 mb-3">
              <File className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="font-semibold">Other</h3>
            <p className="text-sm text-muted-foreground">{stats.other} files</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>
            {activeFilter === 'all' 
              ? 'All Documents' 
              : activeFilter === 'documents' 
                ? 'Document Files' 
                : activeFilter === 'images' 
                  ? 'Image Files' 
                  : 'Other Files'
            }
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="h-9 w-[200px] rounded-md border border-input bg-white px-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-12 py-2 px-4 text-sm font-medium text-muted-foreground">
              <div className="col-span-5">Name</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-3">Last Modified</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            
            {filteredDocuments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {searchQuery || activeFilter !== 'all' 
                  ? 'No documents match your criteria' 
                  : 'No documents uploaded yet'
                }
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div key={doc.id} className="grid grid-cols-12 py-3 px-4 hover:bg-secondary rounded-lg items-center">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className={`
                      rounded-md p-2
                      ${doc.type.includes('image') ? 'bg-purple-100' : 
                        doc.type.includes('pdf') ? 'bg-red-100' :
                        doc.type.includes('word') || doc.type.includes('document') ? 'bg-blue-100' :
                        doc.type.includes('sheet') || doc.type.includes('excel') ? 'bg-green-100' :
                        doc.type.includes('presentation') || doc.type.includes('powerpoint') ? 'bg-orange-100' :
                        'bg-gray-100'}
                    `}>
                      {getFileIcon(doc.type)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[200px]" title={doc.name}>
                        {getBaseDocumentName(doc.name)}
                      </span>
                      {doc.version && doc.version > 1 && (
                        <span className="text-xs text-muted-foreground">
                          Version {doc.version}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">{formatFileSize(doc.size)}</div>
                  <div className="col-span-3 text-sm text-muted-foreground">{formatDate(doc.created_at)}</div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <button 
                      className="p-1 hover:bg-secondary rounded"
                      onClick={() => handleView(doc)}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button 
                      className="p-1 hover:bg-secondary rounded"
                      onClick={() => viewVersionHistory(doc)}
                      title="Version History"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button 
                      className="p-1 hover:bg-red-100 text-red-500 rounded"
                      onClick={() => handleDelete(doc.name)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.name}</DialogTitle>
            <DialogDescription>
              {viewingDocument && (
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <span>{formatFileSize(viewingDocument.size)}</span>
                  <span>•</span>
                  <span>{formatDate(viewingDocument.created_at)}</span>
                  {viewingDocument.version && viewingDocument.version > 1 && (
                    <>
                      <span>•</span>
                      <span>Version {viewingDocument.version}</span>
                    </>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex justify-center">
            {renderDocumentViewer()}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {viewingDocument && (
              <Button onClick={() => viewVersionHistory(viewingDocument)} variant="outline">
                <History className="mr-2 h-4 w-4" /> View History
              </Button>
            )}
            <Button onClick={() => setIsViewOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isVersionHistoryOpen} onOpenChange={setIsVersionHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Version History
            </DialogTitle>
            <DialogDescription>
              {activeDocument && (
                <p>Document history for {getBaseDocumentName(activeDocument)}</p>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-2">
            {documentVersions.map((version, index) => (
              <div 
                key={version.id}
                className={`p-4 rounded-lg border ${index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-secondary'}`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {getFileIcon(version.type)}
                    <div>
                      <p className="font-medium">
                        Version {version.version || 1}
                        {index === 0 && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">Latest</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Uploaded {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setViewingDocument(version);
                        setIsVersionHistoryOpen(false);
                        setIsViewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                  </div>
                </div>
                {index === 0 && (
                  <p className="text-sm text-blue-600 mt-2">Current version</p>
                )}
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsVersionHistoryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Documents;
