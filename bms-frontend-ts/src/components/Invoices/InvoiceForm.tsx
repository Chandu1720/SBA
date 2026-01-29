import React, { useEffect, useState, useRef } from 'react';
import { createInvoice, updateInvoice } from '../../services/invoiceService';
import { getSuppliers } from '../../services/supplierService';
import { Invoice, Supplier } from '../../types/models';
import { extractTextFromImage, parseInvoiceText, calculateConfidenceScore } from '../../services/ocrService';
import toast from 'react-hot-toast';
import {
  User,
  Calendar,
  IndianRupee,
  CreditCard,
  FileText,
  Upload,
  StickyNote,
  Camera,
  Image,
} from 'lucide-react';

interface InvoiceFormProps {
  invoice: Invoice | null;
  onClose: () => void;
}

const Field = ({ icon: Icon, children }: any) => (
  <div className="flex items-center gap-3 border rounded-md px-3 py-2">
    <Icon size={18} className="text-gray-500" />
    <div className="flex-1">{children}</div>
  </div>
);

const Label = ({ text }: { text: string }) => (
  <label className="text-sm font-semibold text-gray-700 mb-1 block">
    {text}
  </label>
);

const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice, onClose }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] =
    useState<'Pending' | 'Paid' | 'Partial'>('Pending');
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{
    invoiceNo?: string;
    date?: string;
    amount?: number;
  }>({});

  /* ---------------- Load Suppliers ---------------- */
  useEffect(() => {
  const fetchSuppliers = async () => {
    try {
      const res = await getSuppliers({ limit: 1000 });

      if (Array.isArray(res?.suppliers)) {
        setSuppliers(res.suppliers);
      } else {
        setSuppliers([]);
      }
    } catch {
      setError('Failed to load suppliers');
      setSuppliers([]);
    }
  };

  fetchSuppliers();
}, []);


  /* ---------------- Edit Mode ---------------- */
  useEffect(() => {
    if (!invoice) return;

    setSupplierId(invoice.supplierId?._id || '');
    setSupplierInvoiceNumber(invoice.supplierInvoiceNumber || '');
    setInvoiceDate(invoice.invoiceDate.slice(0, 10));
    setDueDate(invoice.dueDate.slice(0, 10));
    setAmount(invoice.amount);
    setPaymentStatus(invoice.paymentStatus as any);
    setPaidAmount(invoice.paidAmount || 0);
    setPaymentMode(invoice.paymentMode || '');
    setNotes(invoice.notes || '');
    
    // Load existing payment proof if available
    if (invoice.paymentProof) {
      setPaymentProofPreview(invoice.paymentProof);
    }
  }, [invoice]);

  /* ---------------- Payment Logic ---------------- */
  useEffect(() => {
    if (paymentStatus === 'Paid') setPaidAmount(amount);
    if (paymentStatus === 'Pending') setPaidAmount(0);
  }, [paymentStatus, amount]);

  /* ---------------- OCR Processing from File/Camera ---------------- */
  const processImageWithOCR = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Please use JPG or PNG images for OCR');
      return;
    }

    try {
      setOcrProcessing(true);
      toast('Processing invoice image... This may take 30-60 seconds', { icon: '⏳' });

      // Extract text from image
      const { text } = await extractTextFromImage(file);

      // Parse invoice fields
      const parsedData = parseInvoiceText(text);
      const confidence = calculateConfidenceScore(parsedData);

      // Store extracted data for display
      setExtractedData({
        invoiceNo: parsedData.supplierInvoiceNumber,
        date: parsedData.invoiceDate,
        amount: parsedData.amount,
      });

      // Auto-fill form fields
      if (parsedData.supplierInvoiceNumber) {
        setSupplierInvoiceNumber(parsedData.supplierInvoiceNumber);
      }
      if (parsedData.invoiceDate) {
        setInvoiceDate(parsedData.invoiceDate);
      }
      if (parsedData.dueDate) {
        setDueDate(parsedData.dueDate);
      }
      if (parsedData.amount) {
        setAmount(parsedData.amount);
      }

      // Show confidence feedback
      if (confidence >= 70) {
        toast.success(`✓ Data extracted (${confidence}% confidence)`);
      } else if (confidence >= 40) {
        toast(`⚠️ Verify fields (${confidence}% confidence)`, { icon: '🔍' });
      } else {
        toast.error('Low confidence. Please fill details manually.');
      }

      // Store file for upload
      setInvoiceFile(file);
    } catch (err: any) {
      toast.error('OCR failed. Using image as-is.');
      setInvoiceFile(file);
    } finally {
      setOcrProcessing(false);
    }
  };

  /* ---------------- File Input Handler ---------------- */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show image preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Process with OCR
      processImageWithOCR(file);
    }
  };

  /* ---------------- Submit ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierId) return setError('Supplier is required');
    if (paymentStatus !== 'Pending' && !paymentMode)
      return setError('Payment mode required');
    if (paymentStatus === 'Partial' && (paidAmount <= 0 || paidAmount >= amount))
      return setError('Invalid partial payment');

    const formData = new FormData();
    formData.append('supplierId', supplierId);
    formData.append('supplierInvoiceNumber', supplierInvoiceNumber);
    formData.append('invoiceDate', invoiceDate);
    formData.append('dueDate', dueDate);
    formData.append('amount', amount.toString());
    formData.append('paymentStatus', paymentStatus);
    formData.append('paidAmount', paidAmount.toString());
    formData.append('paymentMode', paymentMode);
    formData.append('notes', notes);

    if (invoiceFile) {
      formData.append('invoiceCopy', invoiceFile);
    }
    
    if (paymentProofFile) {
      formData.append('paymentProof', paymentProofFile);
    }

    try {
      setLoading(true);
      invoice?._id
        ? await updateInvoice(invoice._id, formData)
        : await createInvoice(formData);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">
        {invoice ? 'Edit Invoice' : 'Create Invoice'}
      </h2>

      {error && <p className="text-red-600 mb-3">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label text="Supplier" />
          <Field icon={User}>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full outline-none bg-transparent"
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <Label text="Supplier Invoice Number" />
          <Field icon={FileText}>
            <input
              type="text"
              placeholder="e.g., INV-2025-001"
              value={supplierInvoiceNumber}
              onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              className="w-full outline-none bg-transparent"
            />
          </Field>
        </div>

        <div>
          <Label text="Invoice Date" />
          <Field icon={Calendar}>
            <input type="date" value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full outline-none bg-transparent" />
          </Field>
        </div>

        <div>
          <Label text="Due Date" />
          <Field icon={Calendar}>
            <input type="date" value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full outline-none bg-transparent" />
          </Field>
        </div>

        <div>
          <Label text="Amount" />
          <Field icon={IndianRupee}>
            <input type="number" value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full outline-none bg-transparent" />
          </Field>
        </div>

        <div>
          <Label text="Payment Status" />
          <Field icon={FileText}>
            <select value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as any)}
              className="w-full outline-none bg-transparent">
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </Field>
        </div>

        <div>
          <Label text="Paid Amount" />
          <Field icon={IndianRupee}>
            <input type="number" value={paidAmount}
              disabled={paymentStatus !== 'Partial'}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              className="w-full outline-none bg-transparent" />
          </Field>
        </div>

        <div>
          <Label text="Payment Mode" />
          <Field icon={CreditCard}>
            <select 
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full outline-none bg-transparent"
            >
              <option value="">Select payment mode</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="UPI">UPI</option>
            </select>
          </Field>
        </div>

        {/* Conditional Payment Proof Upload for Cheque/UPI */}
        {(paymentMode === 'Cheque' || paymentMode === 'UPI') && (
          <div>
            <Label text={`${paymentMode} Proof Document`} />
            <Field icon={Upload}>
              {paymentProofPreview ? (
                <div className="w-full">
                  {paymentProofPreview.startsWith('/') ? (
                    // Existing file from database
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-700 mb-2">
                        <strong>📄 Current proof:</strong> {paymentProofPreview.split('/').pop()}
                      </p>
                      <a
                        href={`http://localhost:5002${paymentProofPreview}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800 underline text-sm"
                      >
                        View current proof
                      </a>
                    </div>
                  ) : (
                    // New file preview
                    <img 
                      src={paymentProofPreview} 
                      alt="Payment proof preview" 
                      className="max-h-40 w-full rounded border border-gray-300 object-contain mb-2"
                    />
                  )}
                  <input 
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPaymentProofFile(file);
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setPaymentProofPreview(event.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs w-full mt-2"
                  />
                </div>
              ) : (
                <input 
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPaymentProofFile(file);
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setPaymentProofPreview(event.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="text-sm w-full"
                />
              )}
            </Field>
            <p className="text-xs text-gray-500 mt-1">📸 Upload {paymentMode} proof (cheque image, UPI screenshot, etc.)</p>
          </div>
        )}

        <div>
          <Label text="Notes" />
          <Field icon={StickyNote}>
            <textarea rows={3} value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full outline-none bg-transparent resize-none" />
          </Field>
        </div>

        <div>
          <Label text="Invoice Document" />
          <Field icon={Upload}>
            {imagePreview ? (
              <div className="w-full">
                <img 
                  src={imagePreview} 
                  alt="Invoice preview" 
                  className="max-h-40 w-full rounded border border-gray-300 object-contain mb-2"
                />
                {ocrProcessing && (
                  <p className="text-xs text-blue-600 animate-pulse mb-2">⏳ Processing OCR...</p>
                )}
                {/* Display Extracted Data */}
                {extractedData.invoiceNo && (
                  <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                    <p className="text-xs text-green-700">
                      <strong>📄 Invoice No:</strong> {extractedData.invoiceNo}
                    </p>
                    {extractedData.date && (
                      <p className="text-xs text-green-700">
                        <strong>📅 Date:</strong> {extractedData.date}
                      </p>
                    )}
                    {extractedData.amount && (
                      <p className="text-xs text-green-700">
                        <strong>💰 Amount:</strong> ₹{extractedData.amount}
                      </p>
                    )}
                  </div>
                )}
                <input 
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileInputChange}
                  disabled={ocrProcessing}
                  className="text-xs w-full mt-2"
                />
              </div>
            ) : (
              <input 
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileInputChange}
                disabled={ocrProcessing}
                className="text-sm w-full" 
              />
            )}
          </Field>
          
          {!invoice && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={ocrProcessing}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-300 rounded hover:bg-blue-100 disabled:opacity-50 text-sm"
              >
                <Camera size={16} /> Take Photo
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={ocrProcessing}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-300 rounded hover:bg-green-100 disabled:opacity-50 text-sm"
              >
                <Image size={16} /> Choose from Gallery
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">💡 Tip: Upload invoice photo for automatic data extraction (OCR)</p>
          <input 
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInputChange}
            disabled={ocrProcessing}
            className="hidden" 
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;
