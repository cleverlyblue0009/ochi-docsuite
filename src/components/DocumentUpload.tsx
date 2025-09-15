import { useState } from "react";
import { Upload, FileText, Image, FileSpreadsheet, File, CheckCircle, X, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export const DocumentUpload = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const mockFiles = [
    { id: 1, name: "Metro_Construction_Contract.pdf", type: "contract", size: "2.4 MB", confidence: 98, status: "processed" },
    { id: 2, name: "Environmental_Impact_Report.docx", type: "report", size: "1.8 MB", confidence: 95, status: "processing" },
    { id: 3, name: "Technical_Drawings.dwg", type: "technical", size: "5.2 MB", confidence: 92, status: "pending" },
  ];

  const fileIcons = {
    pdf: FileText,
    doc: FileText,
    docx: FileText,
    xlsx: FileSpreadsheet,
    jpg: Image,
    png: Image,
    dwg: File,
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    simulateUpload();
  };

  const simulateUpload = () => {
    setIsProcessing(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          toast({
            title: "Upload Complete",
            description: "Documents have been processed successfully with AI classification.",
          });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "processed": return "bg-success text-success-foreground";
      case "processing": return "bg-warning text-warning-foreground";
      case "pending": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || 'file';
    return fileIcons[extension as keyof typeof fileIcons] || File;
  };

  return (
    <section id="documents" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl lg:text-4xl font-heading font-bold text-foreground">
            Smart Document Processing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload documents for AI-powered classification, OCR processing, and automated workflow routing
          </p>
        </div>

        {/* Upload Area */}
        <Card className="border-0 shadow-metro">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-primary" />
              <span>Document Upload</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center smooth-transition ${
                isDragOver 
                  ? "border-primary bg-primary/5 shadow-glow" 
                  : "border-border hover:border-primary/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-gradient-metro rounded-full flex items-center justify-center">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-heading font-semibold text-foreground">
                    Drop files here or click to browse
                  </h3>
                  <p className="text-muted-foreground">
                    Supports PDF, DOC, DOCX, XLSX, JPG, PNG, CAD files up to 20MB
                  </p>
                </div>

                <Button 
                  className="bg-gradient-metro text-white shadow-glow hover:shadow-elevated smooth-transition"
                  onClick={simulateUpload}
                >
                  Select Files
                </Button>

                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="w-full max-w-md mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Processing documents... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing Queue */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* File List */}
          <Card className="border-0 shadow-metro">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-secondary" />
                <span>Processing Queue</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockFiles.map((file) => {
                  const IconComponent = getFileIcon(file.name);
                  return (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center shadow-metro">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{file.name}</p>
                          <p className="text-sm text-muted-foreground">{file.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(file.status)}>
                          {file.status}
                        </Badge>
                        {file.status === "processed" && (
                          <CheckCircle className="h-4 w-4 text-success" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* AI Classification Results */}
          <Card className="border-0 shadow-metro">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-accent" />
                <span>AI Classification Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockFiles.map((file) => (
                  <div key={file.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        {file.name.split('.')[0]}
                      </span>
                      <Badge variant="outline" className="bg-gradient-metro text-white border-0">
                        {file.confidence}% confidence
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Document Type:</span>
                        <span className="font-medium text-foreground capitalize">{file.type}</span>
                      </div>
                      <Progress value={file.confidence} className="h-2" />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        OCR Extracted
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Auto-Tagged
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Routed to Workflow
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};