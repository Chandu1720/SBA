import React, { useState, useRef } from 'react';
import { Upload, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import {
  extractTextFromImage,
  parseInvoiceText,
  calculateConfidenceScore,
  ExtractedInvoiceData,
} from '../../services/ocrService';
import toast from 'react-hot-toast';

interface OCRUploadProps {
  onDataExtracted: (data: ExtractedInvoiceData, file: File) => void;
  disabled?: boolean;
}

const OCRUpload: React.FC<OCRUploadProps> = ({ onDataExtracted, disabled = false }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, PNG)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setIsProcessing(true);
      setExtractedData(null);

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Extract text from image
      const { text } = await extractTextFromImage(file);
      setRawText(text);

      // Parse extracted text
      const parsedData = parseInvoiceText(text);
      const confidence = calculateConfidenceScore(parsedData);
      parsedData.confidence = confidence;

      setExtractedData(parsedData);

      // Auto-fill form
      onDataExtracted(parsedData, file);

      // Show toast based on confidence
      if (confidence >= 70) {
        toast.success(`✓ Data extracted (${confidence}% confidence)`);
      } else if (confidence >= 40) {
        toast(
          `⚠ Data extracted but confidence is low (${confidence}%). Please verify fields.`,
          { icon: '🔍' }
        );
      } else {
        toast.error('Could not extract clear data. Please fill details manually.');
      }
    } catch (error: any) {
      toast.error(error.message || 'OCR processing failed');
      setPreviewUrl(null);
      setExtractedData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
        }}
        onDrop={handleDragDrop}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer transition hover:border-blue-400 hover:bg-blue-50"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          disabled={disabled || isProcessing}
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader size={32} className="text-blue-500 animate-spin" />
            <p className="text-sm text-gray-600">
              Processing invoice image... (this may take 30-60 seconds)
            </p>
          </div>
        ) : previewUrl ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={previewUrl}
              alt="Invoice preview"
              className="h-32 object-contain rounded border"
            />
            <p className="text-sm text-gray-600">
              {extractedData ? 'Data extracted ✓' : 'Click to upload new image'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={32} className="text-gray-400" />
            <p className="font-medium text-gray-700">Upload Invoice Photo/Document</p>
            <p className="text-xs text-gray-500">
              Drag and drop or click to select • Supports JPG, PNG • Max 5MB
            </p>
          </div>
        )}
      </div>

      {/* Extracted Data Preview */}
      {extractedData && (
        <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
          <div className="flex items-center gap-2">
            {extractedData.confidence >= 70 ? (
              <CheckCircle size={20} className="text-green-600" />
            ) : (
              <AlertCircle size={20} className="text-amber-600" />
            )}
            <span className="font-semibold text-sm">
              Extracted Data ({extractedData.confidence}% confidence)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {extractedData.supplierInvoiceNumber && (
              <div className="bg-white p-2 rounded border border-gray-300">
                <span className="text-gray-600 text-xs">Invoice Number</span>
                <p className="font-medium">{extractedData.supplierInvoiceNumber}</p>
              </div>
            )}

            {extractedData.invoiceDate && (
              <div className="bg-white p-2 rounded border border-gray-300">
                <span className="text-gray-600 text-xs">Date</span>
                <p className="font-medium">{extractedData.invoiceDate}</p>
              </div>
            )}

            {extractedData.amount && (
              <div className="bg-white p-2 rounded border border-gray-300">
                <span className="text-gray-600 text-xs">Amount</span>
                <p className="font-medium">₹ {extractedData.amount.toFixed(2)}</p>
              </div>
            )}

            {extractedData.dueDate && (
              <div className="bg-white p-2 rounded border border-gray-300">
                <span className="text-gray-600 text-xs">Due Date</span>
                <p className="font-medium">{extractedData.dueDate}</p>
              </div>
            )}
          </div>

          {extractedData.confidence < 70 && (
            <div className="bg-amber-100 border border-amber-300 rounded p-2 text-xs text-amber-800">
              ⚠️ Low confidence extraction. Please verify the extracted data above and correct
              any inaccuracies.
            </div>
          )}

          {/* Show Raw Text Toggle */}
          <button
            type="button"
            onClick={() => setShowRawText(!showRawText)}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {showRawText ? 'Hide' : 'Show'} extracted text
          </button>

          {showRawText && (
            <div className="bg-white border rounded p-2 max-h-40 overflow-y-auto">
              <p className="text-xs whitespace-pre-wrap text-gray-700 font-mono">
                {rawText}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OCRUpload;
