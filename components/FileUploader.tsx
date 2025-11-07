import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, XCircle, Loader2 } from 'lucide-react';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload, isLoading, error }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFileName(file.name);
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/tab-separated-values': ['.tsv'],
      'text/plain': ['.txt'], // Allow .txt as well
    },
    multiple: false,
  });

  const dropzoneClasses = `
    border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
    ${isDragActive 
      ? 'border-brand-primary bg-brand-primary/10' 
      : 'border-gray-300 dark:border-gray-600 hover:border-brand-primary hover:bg-gray-50 dark:hover:bg-gray-800/50'
    }
  `;

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-light-card dark:bg-dark-card p-8 rounded-xl shadow-md">
        <h2 className="text-2xl font-semibold text-center mb-6 text-light-text dark:text-dark-text">Upload Your Transaction File</h2>
        <p className="text-center text-light-text-secondary dark:text-dark-text-secondary mb-6">
          Drag and drop a TSV file or click to select a file to get started.
        </p>
        
        <div {...getRootProps()} className={dropzoneClasses}>
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-4">
            <UploadCloud className="h-12 w-12 text-gray-400" />
            {isDragActive ? (
              <p className="text-brand-primary font-semibold">Drop the file here ...</p>
            ) : (
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Drag 'n' drop a file here, or click to select a file
              </p>
            )}
             <p className="text-xs text-gray-500 dark:text-gray-400">Supported formats: .tsv, .txt</p>
          </div>
        </div>

        {isLoading && (
          <div className="mt-6 flex items-center justify-center gap-2 text-brand-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="font-semibold">Processing your file...</p>
          </div>
        )}

        {fileName && !isLoading && !error && (
            <div className="mt-6 flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <FileText className="h-5 w-5" />
                <p>File loaded: <span className="font-medium">{fileName}</span>. Ready for analysis.</p>
            </div>
        )}

        {error && !isLoading && (
          <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-3">
            <XCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
