import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoiceById } from '../../services/invoiceService';
import { Invoice } from '../../types/models';
import InvoiceForm from './InvoiceForm';

const InvoiceFormWrapper: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getInvoiceById(id)
        .then(data => {
          setInvoice(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [id]);

  const handleClose = () => {
    navigate('/invoices');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return <InvoiceForm invoice={invoice} onClose={handleClose} />;
};

export default InvoiceFormWrapper;
