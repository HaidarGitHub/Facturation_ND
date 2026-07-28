import React, { useState, useEffect } from 'react';
import { Button, Table, Modal, Form, Alert } from 'react-bootstrap';
import api from '../utils/api';

const PDFManager = ({ candidate, onPDFUpdate, API_BASE_URL, canUpdate = true }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [localPDFs, setLocalPDFs] = useState(candidate.pdfs || []);

  // Update localPDFs when candidate changes
  useEffect(() => {
    setLocalPDFs(candidate.pdfs || []);
  }, [candidate.pdfs]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError('');
    } else {
      setError('Veuillez sélectionner un fichier PDF valide');
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await api.post(`${API_BASE_URL}/candidates/${candidate.id}/pdfs`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newPDF = response.data;
      setLocalPDFs(prev => [...prev, newPDF]);
      setSuccess('PDF téléchargé avec succès !');
      setSelectedFile(null);
      setShowUploadModal(false);
      
      // Refresh candidate data to show new PDF
      if (onPDFUpdate) {
        onPDFUpdate();
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      setError('Erreur lors du téléchargement: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (pdfId, originalFilename) => {
    try {
      const response = await api.get(`${API_BASE_URL}/pdfs/${pdfId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement du PDF');
    }
  };

  const handleDelete = async (pdfId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce PDF ?')) {
      try {
        await api.delete(`${API_BASE_URL}/pdfs/${pdfId}`);
        
        // Update local state
        setLocalPDFs(prev => prev.filter(pdf => pdf.id !== pdfId));
        
        if (onPDFUpdate) {
          onPDFUpdate();
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression du PDF');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h4>Documents PDF</h4>
        {canUpdate && (
        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => setShowUploadModal(true)}
        >
          + Ajouter un PDF
        </Button>
        )}
      </div>

      {localPDFs && localPDFs.length > 0 ? (
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Nom du fichier</th>
              <th>Date d'upload</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {localPDFs.map((pdf) => (
              <tr key={pdf.id}>
                <td>{pdf.original_filename}</td>
                <td>{formatDate(pdf.upload_date)}</td>
                <td>
                  <Button
                    variant="info"
                    size="sm"
                    style={{ marginRight: '5px' }}
                    onClick={() => handleDownload(pdf.id, pdf.original_filename)}
                  >
                    Télécharger
                  </Button>
                  {canUpdate && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(pdf.id)}
                  >
                    Supprimer
                  </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p style={{ color: '#666', fontStyle: 'italic' }}>
          Aucun document PDF pour ce candidat.
        </p>
      )}

      {/* Upload Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Ajouter un PDF</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          <Form.Group>
            <Form.Label>Sélectionner un fichier PDF</Form.Label>
            <Form.Control
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <Form.Text className="text-muted">
              Taille maximale: 50MB. Seuls les fichiers PDF sont acceptés.
            </Form.Text>
          </Form.Group>
          
          {selectedFile && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
              <strong>Fichier sélectionné:</strong> {selectedFile.name}
              <br />
              <small>Taille: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</small>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUploadModal(false)} disabled={uploading}>
            Annuler
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpload} 
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Téléchargement...' : 'Télécharger'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PDFManager; 