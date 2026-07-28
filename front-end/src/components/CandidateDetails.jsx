import React, { useState, useEffect } from "react";
import { Container, Card, Button, Row, Col, Table, Modal, Form } from "react-bootstrap";
import RevenueForm from "./RevenueForm";
import ExpenseForm from "./ExpenseForm";
import CandidateForm from "./CandidateForm";
import PDFManager from "./PDFManager";

const CandidateDetails = ({
  appStyles,
  selectedCandidate,
  selectedService,
  setCurrentPage,
  setSelectedCandidate,
  setShowEditCandidateModal,
  setEditCandidate,
  handleEditCandidate,
  showEditCandidateModal,
  editCandidate,
  editingRevenueId,
  setEditingRevenueId,
  editRevenueData,
  setEditRevenueData,
  handleEditRevenue,
  handleSaveRevenue,
  handleDeleteRevenue,
  showAddRevenueModal,
  setShowAddRevenueModal,
  newRevenue,
  handleAddRevenue,
  editingExpenseId,
  setEditingExpenseId,
  editExpenseData,
  setEditExpenseData,
  handleEditExpense,
  handleSaveExpense,
  handleDeleteExpense,
  showAddExpenseModal,
  setShowAddExpenseModal,
  newExpense,
  handleAddExpense,
  generatePDF,
  onSaveNote,
  API_BASE_URL,
  canUpdate = true,
}) => {
  // Hooks doivent être appelés avant tout return conditionnel
  const [noteValue, setNoteValue] = useState(selectedCandidate ? selectedCandidate.note || "" : "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [showDeletePdfModal, setShowDeletePdfModal] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState(null);
  const [showDeleteRevenueModal, setShowDeleteRevenueModal] = useState(false);
  const [revenueToDelete, setRevenueToDelete] = useState(null);
  const [showDeleteExpenseModal, setShowDeleteExpenseModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  
  // State pour tracker quel champ a été édité en dernier (pour les revenus)
  const [lastEditedRevenueField, setLastEditedRevenueField] = useState(null);
  
  // State pour tracker quel champ a été édité en dernier (pour les dépenses)
  const [lastEditedExpenseField, setLastEditedExpenseField] = useState(null);

  // Calcul automatique bidirectionnel pour les revenus
  useEffect(() => {
    if (editRevenueData.tva !== undefined && editRevenueData.tva !== null) {
      const tva = Number(editRevenueData.tva) || 0;
      
      if (lastEditedRevenueField === 'amountHT' && editRevenueData.amountHT) {
        // Calculer TTC à partir de HT
        const amountHT = Number(editRevenueData.amountHT) || 0;
        const amountTTC = amountHT * (1 + tva / 100);
        setEditRevenueData((prev) => ({
          ...prev,
          amountTTC: amountTTC.toFixed(2),
        }));
      } else if (lastEditedRevenueField === 'amountTTC' && editRevenueData.amountTTC) {
        // Calculer HT à partir de TTC
        const amountTTC = Number(editRevenueData.amountTTC) || 0;
        const amountHT = amountTTC / (1 + tva / 100);
        setEditRevenueData((prev) => ({
          ...prev,
          amountHT: amountHT.toFixed(2),
        }));
      }
    }
  }, [editRevenueData.amountHT, editRevenueData.amountTTC, editRevenueData.tva, lastEditedRevenueField, setEditRevenueData]);

  // Calcul automatique bidirectionnel pour les dépenses
  useEffect(() => {
    if (editExpenseData.tva !== undefined && editExpenseData.tva !== null) {
      const tva = Number(editExpenseData.tva) || 0;
      
      if (lastEditedExpenseField === 'amountHT' && editExpenseData.amountHT) {
        // Calculer TTC à partir de HT
        const amountHT = Number(editExpenseData.amountHT) || 0;
        const amountTTC = amountHT * (1 + tva / 100);
        setEditExpenseData((prev) => ({
          ...prev,
          amountTTC: amountTTC.toFixed(2),
        }));
      } else if (lastEditedExpenseField === 'amountTTC' && editExpenseData.amountTTC) {
        // Calculer HT à partir de TTC
        const amountTTC = Number(editExpenseData.amountTTC) || 0;
        const amountHT = amountTTC / (1 + tva / 100);
        setEditExpenseData((prev) => ({
          ...prev,
          amountHT: amountHT.toFixed(2),
        }));
      }
    }
  }, [editExpenseData.amountHT, editExpenseData.amountTTC, editExpenseData.tva, lastEditedExpenseField, setEditExpenseData]);

  // Reset last edited field when editing starts
  useEffect(() => {
    if (editingRevenueId) {
      setLastEditedRevenueField(null);
    }
  }, [editingRevenueId]);

  useEffect(() => {
    if (editingExpenseId) {
      setLastEditedExpenseField(null);
    }
  }, [editingExpenseId]);

  // Reset last edited field when editing ends
  useEffect(() => {
    if (!editingRevenueId) {
      setLastEditedRevenueField(null);
    }
  }, [editingRevenueId]);

  useEffect(() => {
    if (!editingExpenseId) {
      setLastEditedExpenseField(null);
    }
  }, [editingExpenseId]);

  if (!selectedCandidate) return <p style={appStyles.container}>Sélectionnez un candidat.</p>;

  // Vérifier et initialiser les tableaux revenues et expenses s'ils sont undefined
  const revenues = Array.isArray(selectedCandidate.revenues) ? selectedCandidate.revenues : [];
  const expenses = Array.isArray(selectedCandidate.expenses) ? selectedCandidate.expenses : [];

  // Ajout de logs détaillés pour diagnostic
  console.log("revenues", revenues);
  console.log("expenses", expenses);
  revenues.forEach((r, i) => console.log(`Revenue[${i}]`, r));
  expenses.forEach((e, i) => console.log(`Expense[${i}]`, e));

  // Calcul du solde avec gestion des valeurs nulles
  const balance = revenues.reduce((s, r) => s + (Number(r.amountTTC) || 0), 0) -
                 expenses.reduce((s, e) => s + (Number(e.amountTTC) || 0), 0);

  const handleNoteSave = async () => {
    setNoteSaving(true);
    setNoteSaved(false);
    if (onSaveNote) {
      await onSaveNote(selectedCandidate.id, noteValue);
      setNoteSaved(true);
    }
    setNoteSaving(false);
    setTimeout(() => setNoteSaved(false), 1500);
  };

  // Fonction utilitaire pour sécuriser les conversions numériques
  const safeNumber = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  // Calculs pour le tableau de synthèse avec gestion des valeurs nulles
  const incomeMontant = revenues.reduce((sum, r) => sum + safeNumber(r.amount), 0);
  const incomeHT = revenues.reduce((sum, r) => sum + safeNumber(r.amountHT), 0);
  const incomeTTC = revenues.reduce((sum, r) => sum + safeNumber(r.amountTTC), 0);
  const outcomeMontant = expenses.reduce((sum, e) => sum + safeNumber(e.amount), 0);
  const outcomeHT = expenses.reduce((sum, e) => sum + safeNumber(e.amountHT), 0);
  const outcomeTTC = expenses.reduce((sum, e) => sum + safeNumber(e.amountTTC), 0);
  const resultatHT = incomeHT - outcomeHT;
  const tvaCollectee = revenues.reduce((sum, r) => sum + (safeNumber(r.amountHT) * safeNumber(r.tva) / 100), 0);
  const tvaDeductible = expenses.reduce((sum, e) => sum + (safeNumber(e.amountHT) * safeNumber(e.tva) / 100), 0);
  const tvaNette = tvaCollectee - tvaDeductible;

  // Débogage des données
  console.log("Selected Candidate Revenues:", revenues);
  console.log("Selected Candidate Expenses:", expenses);
  console.log("Calculated Values:", { incomeHT, incomeTTC, outcomeHT, outcomeTTC, resultatHT, tvaCollectee, tvaDeductible, tvaNette });

  const confirmDeletePdf = (pdfId) => {
    setPdfToDelete(pdfId);
    setShowDeletePdfModal(true);
  };

  const handleConfirmDeletePdf = async () => {
    if (pdfToDelete) {
      await handlePdfDelete(pdfToDelete);
      setShowDeletePdfModal(false);
      setPdfToDelete(null);
    }
  };

  const confirmDeleteRevenue = (revenueId) => {
    setRevenueToDelete(revenueId);
    setShowDeleteRevenueModal(true);
  };

  const handleConfirmDeleteRevenue = async () => {
    if (revenueToDelete) {
      await handleDeleteRevenue(revenueToDelete);
      setShowDeleteRevenueModal(false);
      setRevenueToDelete(null);
    }
  };

  const confirmDeleteExpense = (expenseId) => {
    setExpenseToDelete(expenseId);
    setShowDeleteExpenseModal(true);
  };

  const handleConfirmDeleteExpense = async () => {
    if (expenseToDelete) {
      await handleDeleteExpense(expenseToDelete);
      setShowDeleteExpenseModal(false);
      setExpenseToDelete(null);
    }
  };

  const handlePDFUpdate = async () => {
    // This function will be called when PDFs are added/removed
    // The PDFManager will handle the refresh internally
    if (selectedCandidate) {
      // No need to reload the page - PDFManager handles local state
    }
  };

  return (
    <Container fluid style={appStyles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={appStyles.heading}>
          {selectedCandidate.firstName} {selectedCandidate.lastName} - {selectedService ? selectedService.name : 'Service'}
        </h2>
        <Button
          variant="secondary"
          onClick={() => {
            setCurrentPage("candidates");
            setSelectedCandidate(null);
          }}
        >
          ← Retour aux candidats
        </Button>
      </div>
      <Card>
        <Card.Body>
          <Row>
            <Col md={8} xs={12}>
              <p><strong>Email :</strong> {selectedCandidate.email || 'Non défini'}</p>
              <p><strong>Téléphone :</strong> {selectedCandidate.phone || 'Non défini'}</p>
              <p><strong>Pays :</strong> {selectedCandidate.country || 'Non défini'}</p>
              <p>
                <strong>Statut :</strong> {selectedCandidate.status || 'En cours'}
                {selectedCandidate.status === 'Terminé' && selectedCandidate.terminatedAt && (
                  <span style={{ marginLeft: 8, color: '#28a745' }}>
                    (Terminé le : {selectedCandidate.terminatedAt.replace('T', ' ').slice(0, 19)})
                  </span>
                )}
                {selectedCandidate.status === 'Terminé' && !selectedCandidate.terminatedAt && (
                  <span style={{ marginLeft: 8, color: '#dc3545' }}>
                    (Date de fin non disponible)
                  </span>
                )}
              </p>
              <p>
                <strong>Date de création :</strong> {selectedCandidate.createdAt ? selectedCandidate.createdAt.replace('T', ' ').slice(0, 19) : 'Non défini'}
              </p>
              {canUpdate && (
              <Button
                variant="warning"
                size="sm"
                style={appStyles.button}
                onClick={() => {
                  setEditCandidate({
                    id: selectedCandidate.id,
                    firstName: selectedCandidate.firstName || "",
                    lastName: selectedCandidate.lastName || "",
                    email: selectedCandidate.email || "",
                    phone: selectedCandidate.phone || "",
                    country: selectedCandidate.country || "",
                    status: selectedCandidate.status || "En cours",
                    service_id: selectedCandidate.service_id || null,
                    type_equivalence: selectedCandidate.type_equivalence || "",
                  });
                  setShowEditCandidateModal(true);
                }}
              >
                Modifier
              </Button>
              )}
            </Col>
            <Col md={4} xs={12}>
              <div style={{ borderLeft: '1px solid #eee', paddingLeft: 16, minHeight: 120, backgroundColor: '#fff3cd', padding: '16px', borderRadius: '8px' }}>
                <strong>Note :</strong>
                <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    placeholder="Écrire une note..."
                    disabled={noteSaving || !canUpdate}
                    readOnly={!canUpdate}
                    style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107' }}
                  />
                  {canUpdate && (
                  <Button
                    variant="primary"
                    size="sm"
                    style={{ marginTop: 8 }}
                    onClick={handleNoteSave}
                    disabled={noteSaving}
                  >
                    {noteSaving ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                  )}
                  {noteSaved && <span style={{ color: 'green', marginLeft: 8 }}>Enregistré !</span>}
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* PDF Manager Section */}
      <Card style={{ marginBottom: '20px' }}>
        <Card.Body>
          <PDFManager 
            candidate={selectedCandidate}
            onPDFUpdate={handlePDFUpdate}
            API_BASE_URL={API_BASE_URL}
            canUpdate={canUpdate}
          />
        </Card.Body>
      </Card>
      
      <Row>
        <Col md={6} xs={12}>
          <h3>Revenus</h3>
          {canUpdate && (
          <Button variant="primary" size="sm" style={appStyles.button} onClick={() => setShowAddRevenueModal(true)}>
            + Ajouter
          </Button>
          )}
          <Table striped bordered hover style={appStyles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Type</th>
                <th>Montant HT (DT)</th>
                <th>TVA (%)</th>
                <th>Montant TTC (DT)</th>
                <th>Description</th>
                {canUpdate && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {revenues.length > 0 ? revenues.map((rev) => (
                <tr key={rev.id}>
                  {editingRevenueId === rev.id ? (
                    <>
                      <td>
                        <Form.Control
                          type="date"
                          value={editRevenueData.date || ""}
                          onChange={(e) => setEditRevenueData({ ...editRevenueData, date: e.target.value })}
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={selectedService ? selectedService.name : ""}
                          readOnly
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value="Income"
                          readOnly
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={editRevenueData.amountHT || ""}
                          onChange={(e) => {
                            setEditRevenueData({
                              ...editRevenueData,
                              amountHT: e.target.value.replace(/[^\d.,]/g, "").replace(",", "."),
                            });
                            setLastEditedRevenueField('amountHT');
                          }}
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={editRevenueData.tva !== undefined && editRevenueData.tva !== null ? editRevenueData.tva : "0"}
                          onChange={(e) => {
                            setEditRevenueData({
                              ...editRevenueData,
                              tva: e.target.value.replace(/[^\d.,]/g, "").replace(",", "."),
                            });
                            setLastEditedRevenueField('tva');
                          }}
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={editRevenueData.amountTTC || ""}
                          onChange={(e) => {
                            setEditRevenueData({
                              ...editRevenueData,
                              amountTTC: e.target.value.replace(/[^\d.,]/g, "").replace(",", "."),
                            });
                            setLastEditedRevenueField('amountTTC');
                          }}
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={editRevenueData.description || ""}
                          onChange={(e) => setEditRevenueData({ ...editRevenueData, description: e.target.value })}
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Button
                          variant="primary"
                          size="sm"
                          style={appStyles.button}
                          onClick={() => handleSaveRevenue(rev.id)}
                        >
                          Enregistrer
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          style={appStyles.button}
                          onClick={() => {
                            setEditRevenueData({ id: null, description: "", amount: "", amountHT: "", tva: "", amountTTC: "", date: "" });
                            setEditingRevenueId(null);
                            setLastEditedRevenueField(null);
                          }}
                        >
                          Annuler
                        </Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{rev.date || "Non défini"}</td>
                      <td>{selectedService ? selectedService.name : "Non défini"}</td>
                      <td>Income</td>
                      <td>{safeNumber(rev.amountHT).toFixed(2)}</td>
                      <td>{safeNumber(rev.tva).toFixed(2)}</td>
                      <td>{safeNumber(rev.amountTTC).toFixed(2)}</td>
                      <td>{rev.description || "Non défini"}</td>
                      {canUpdate && (
                      <td>
                        <Button
                          variant="warning"
                          size="sm"
                          style={appStyles.button}
                          onClick={() => handleEditRevenue(rev.id)}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          style={appStyles.button}
                          onClick={() => confirmDeleteRevenue(rev.id)}
                        >
                          Supprimer
                        </Button>
                      </td>
                      )}
                    </>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={8}>Aucun revenu disponible</td>
                </tr>
              )}
              <tr style={{ fontWeight: 'bold', background: '#f5f5f5' }}>
                <td colSpan={3}>Total</td>
                <td>{safeNumber(incomeHT).toFixed(2)}</td>
                <td>-</td>
                <td>{safeNumber(incomeTTC).toFixed(2)}</td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </Table>
        </Col>
        <Col md={6} xs={12}>
          <h3>Dépenses</h3>
          {canUpdate && (
          <Button variant="primary" size="sm" style={appStyles.button} onClick={() => setShowAddExpenseModal(true)}>
            + Ajouter
          </Button>
          )}
          <Table striped bordered hover style={appStyles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Type</th>
                <th>Montant HT (DT)</th>
                <th>TVA (%)</th>
                <th>Montant TTC (DT)</th>
                <th>Description</th>
                {canUpdate && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? expenses.map((exp) => (
                <tr key={exp.id}>
                  {editingExpenseId === exp.id ? (
                    <>
                      <td>
                        <Form.Control
                          type="date"
                          value={editExpenseData.date || ""}
                          onChange={(e) => setEditExpenseData({ ...editExpenseData, date: e.target.value })}
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={selectedService ? selectedService.name : ""}
                          readOnly
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value="Outcome"
                          readOnly
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={editExpenseData.amountHT || ""}
                          onChange={(e) => {
                            setEditExpenseData({
                              ...editExpenseData,
                              amountHT: e.target.value.replace(/[^\d.,]/g, "").replace(",", "."),
                            });
                            setLastEditedExpenseField('amountHT');
                          }}
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={editExpenseData.tva !== undefined && editExpenseData.tva !== null ? editExpenseData.tva : "0"}
                          onChange={(e) => {
                            setEditExpenseData({
                              ...editExpenseData,
                              tva: e.target.value.replace(/[^\d.,]/g, "").replace(",", "."),
                            });
                            setLastEditedExpenseField('tva');
                          }}
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={editExpenseData.amountTTC || ""}
                          onChange={(e) => {
                            setEditExpenseData({
                              ...editExpenseData,
                              amountTTC: e.target.value.replace(/[^\d.,]/g, "").replace(",", "."),
                            });
                            setLastEditedExpenseField('amountTTC');
                          }}
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={editExpenseData.description || ""}
                          onChange={(e) => setEditExpenseData({ ...editExpenseData, description: e.target.value })}
                          style={appStyles.input}
                        />
                      </td>
                      <td>
                        <Button
                          variant="primary"
                          size="sm"
                          style={appStyles.button}
                          onClick={() => handleSaveExpense(exp.id)}
                        >
                          Enregistrer
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          style={appStyles.button}
                          onClick={() => {
                            setEditExpenseData({ id: null, description: "", amount: "", amountHT: "", tva: "", amountTTC: "", date: "" });
                            setEditingExpenseId(null);
                            setLastEditedExpenseField(null);
                          }}
                        >
                          Annuler
                        </Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{exp.date || "Non défini"}</td>
                      <td>{selectedService ? selectedService.name : "Non défini"}</td>
                      <td>Outcome</td>
                      <td>{safeNumber(exp.amountHT).toFixed(2)}</td>
                      <td>{safeNumber(exp.tva).toFixed(2)}</td>
                      <td>{safeNumber(exp.amountTTC).toFixed(2)}</td>
                      <td>{exp.description || "Non défini"}</td>
                      {canUpdate && (
                      <td>
                        <Button
                          variant="warning"
                          size="sm"
                          style={appStyles.button}
                          onClick={() => handleEditExpense(exp.id)}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          style={appStyles.button}
                          onClick={() => confirmDeleteExpense(exp.id)}
                        >
                          Supprimer
                        </Button>
                      </td>
                      )}
                    </>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={8}>Aucune dépense disponible</td>
                </tr>
              )}
              <tr style={{ fontWeight: 'bold', background: '#f5f5f5' }}>
                <td colSpan={3}>Total</td>
                <td>{safeNumber(outcomeHT).toFixed(2)}</td>
                <td>-</td>
                <td>{safeNumber(outcomeTTC).toFixed(2)}</td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </Table>
        </Col>
      </Row>
      <Row>
        <Col xs={12}>
          <h3>Résumé de service {selectedService ? selectedService.name : "Service"} </h3>
          <Table striped bordered hover style={appStyles.table}>
            <thead>
              <tr>
                <th>Service</th>
                <th>Income HT (DT)</th>
                <th>Income TTC (DT)</th>
                <th>Outcome HT (DT)</th>
                <th>Outcome TTC (DT)</th>
                <th>Résultat HT (DT)</th>
                <th>TVA Collectée (DT)</th>
                <th>TVA Déductible (DT)</th>
                <th>TVA Nette (DT)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{selectedService ? selectedService.name : "Service"}</td>
                <td>{safeNumber(incomeHT).toFixed(2)}</td>
                <td>{safeNumber(incomeTTC).toFixed(2)}</td>
                <td>{safeNumber(outcomeHT).toFixed(2)}</td>
                <td>{safeNumber(outcomeTTC).toFixed(2)}</td>
                <td>{safeNumber(resultatHT).toFixed(2)}</td>
                <td>{safeNumber(tvaCollectee).toFixed(2)}</td>
                <td>{safeNumber(tvaDeductible).toFixed(2)}</td>
                <td>{safeNumber(tvaNette).toFixed(2)}</td>
              </tr>
            </tbody>
          </Table>
        </Col>
      </Row>
      <Card style={appStyles.card}>
        <Card.Body>
          <Card.Title>Solde : {safeNumber(balance).toFixed(2)} DT</Card.Title>
          <Button variant="success" onClick={() => generatePDF(selectedCandidate)}>
            Générer PDF
          </Button>
        </Card.Body>
      </Card>
      <Modal show={showAddRevenueModal} onHide={() => setShowAddRevenueModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Ajouter un revenu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <RevenueForm
            revenue={newRevenue}
            onSave={handleAddRevenue}
            onCancel={() => setShowAddRevenueModal(false)}
          />
        </Modal.Body>
      </Modal>
      <Modal show={showAddExpenseModal} onHide={() => setShowAddExpenseModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Ajouter une dépense</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ExpenseForm
            expense={newExpense}
            onSave={handleAddExpense}
            onCancel={() => setShowAddExpenseModal(false)}
          />
        </Modal.Body>
      </Modal>
      <Modal show={showEditCandidateModal} onHide={() => setShowEditCandidateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Modifier un candidat</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CandidateForm
            candidate={editCandidate}
            onSave={handleEditCandidate}
            onCancel={() => setShowEditCandidateModal(false)}
            selectedService={selectedService}
          />
        </Modal.Body>
      </Modal>
      <Modal show={showDeletePdfModal} onHide={() => setShowDeletePdfModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmer la suppression</Modal.Title>
        </Modal.Header>
        <Modal.Body>Êtes-vous sûr de vouloir supprimer ce document PDF ?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeletePdfModal(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleConfirmDeletePdf}>
            Supprimer
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showDeleteRevenueModal} onHide={() => setShowDeleteRevenueModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmer la suppression</Modal.Title>
        </Modal.Header>
        <Modal.Body>Êtes-vous sûr de vouloir supprimer ce revenu ?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteRevenueModal(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleConfirmDeleteRevenue}>
            Supprimer
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showDeleteExpenseModal} onHide={() => setShowDeleteExpenseModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmer la suppression</Modal.Title>
        </Modal.Header>
        <Modal.Body>Êtes-vous sûr de vouloir supprimer cette dépense ?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteExpenseModal(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleConfirmDeleteExpense}>
            Supprimer
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CandidateDetails;