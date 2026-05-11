import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle2, Clock, HardDrive, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { DocumentService } from '../services/api';

export function Workspace() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processUpload(e.target.files[0]);
    }
  };

  const processUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      await DocumentService.upload(file, (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      // On success, redirect to processing queue
      navigate('/queue');
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload document. Ensure backend is running.");
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto mt-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Upload Documents</h1>
        <p className="text-muted-foreground mt-1">Upload documents for automatic PII detection and redaction</p>
      </div>

      <div 
        className={`border-2 border-dashed rounded-2xl p-16 text-center transition-colors bg-card ${
          isDragging ? 'border-[#1E3A8A] bg-[#1E3A8A]/5' : 'border-border hover:border-[#1E3A8A]/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            {isUploading ? (
              <>
                <h3 className="text-xl font-semibold text-foreground">Uploading... {uploadProgress}%</h3>
                <div className="w-64 h-2 bg-muted rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-foreground">Drop files here or click to browse</h3>
                <p className="text-sm text-muted-foreground mt-2">Supported formats: PDF, DOCX, XLSX, TXT, PNG, JPG</p>
              </>
            )}
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
            accept=".pdf,.docx,.txt"
          />
          
          {!isUploading && (
            <Button 
              className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white px-8"
              onClick={() => fileInputRef.current?.click()}
            >
              Select Files
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <HardDrive className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Max file size</p>
              <p className="text-lg font-semibold">50 MB</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Batch upload</p>
              <p className="text-lg font-semibold">Up to 100 files</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Processing time</p>
              <p className="text-lg font-semibold">~30 sec/file</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
