import React, { useState } from "react";
import { Container, Table, Button, DropdownButton, Dropdown, Card, Row, Col, Modal, Form } from "react-bootstrap";
import CandidateForm from "./CandidateForm";
import RevenueForm from "./RevenueForm";
import ExpenseForm from "./ExpenseForm";

const Candidates = ({
  appStyles,
  candidates,
  selectedService,
  canUpdate,
  setCurrentPage,
  setSelectedService,
  setIsCandidatesAccessible,
  setSelectedCandidate,
  showAddCandidateModal,
  setShowAddCandidateModal,
  newCandidate,
  handleAddCandidate,
  selectedCandidate,
  setShowEditCandidateModal,
  editCandidate,
  handleEditCandidate,
  showEditCandidateModal,
  handleDeleteCandidate,
  services,
  handleMoveCandidate,
  handleOpenCopyCandidate,
  handleCopyCandidate,
  showCopyCandidateModal,
  setShowCopyCandidateModal,
  candidateToCopy,
  setCandidateToCopy,
  copyCandidate,
  generatePDF,
  editingRevenueId,
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
  editExpenseData,
  setEditExpenseData,
  handleEditExpense,
  handleSaveExpense,
  handleDeleteExpense,
  showAddExpenseModal,
  setShowAddExpenseModal,
  newExpense,
  handleAddExpense
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' or 'desc'
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [showDeleteCandidateModal, setShowDeleteCandidateModal] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [typeEquivalenceFilter, setTypeEquivalenceFilter] = useState("");

  // Extract years and months from candidates
  const years = Array.from(new Set(candidates
    .map(c => c.createdAt && c.createdAt.slice(0, 4))
    .filter(Boolean)
  ));
  const months = Array.from(new Set(candidates
    .filter(c => !selectedYear || (c.createdAt && c.createdAt.slice(0, 4) === selectedYear))
    .map(c => c.createdAt && c.createdAt.slice(5, 7))
    .filter(Boolean)
  ));

  // Only show type d'équivalence filter if the selected service is Préparation des équivalences en Allemagne
  const showTypeEquivalence = selectedService && selectedService.name === "Préparation des équivalences en Allemagne";
  const typeEquivalenceOptions = Array.from(new Set(candidates
    .filter(c => c.type_equivalence && (!selectedService || c.service_id === selectedService.id))
    .map(c => c.type_equivalence)
  ));

  const filteredCandidates = candidates.filter((candidate) => {
    const query = searchQuery.toLowerCase();
    const yearMatch = !selectedYear || (candidate.createdAt && candidate.createdAt.slice(0, 4) === selectedYear);
    const monthMatch = !selectedMonth || (candidate.createdAt && candidate.createdAt.slice(5, 7) === selectedMonth);
    const typeEquivalenceMatch = !showTypeEquivalence || !typeEquivalenceFilter || candidate.type_equivalence === typeEquivalenceFilter;
    return (
      yearMatch &&
      monthMatch &&
      typeEquivalenceMatch &&
      (
        candidate.firstName.toLowerCase().includes(query) ||
        candidate.lastName.toLowerCase().includes(query) ||
        candidate.email.toLowerCase().includes(query) ||
        (candidate.status && candidate.status.toLowerCase().includes(query))
      )
    );
  });

  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    if (sortOrder === "asc") {
      return a.createdAt.localeCompare(b.createdAt);
    } else {
      return b.createdAt.localeCompare(a.createdAt);
    }
  });

  const confirmDeleteCandidate = (candidateId) => {
    setCandidateToDelete(candidateId);
    setShowDeleteCandidateModal(true);
  };

  const handleConfirmDeleteCandidate = () => {
    if (candidateToDelete) {
      handleDeleteCandidate(candidateToDelete);
      setShowDeleteCandidateModal(false);
      setCandidateToDelete(null);
    }
  };

  return (
    <Container fluid style={appStyles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={appStyles.heading}>
          Candidats - {selectedService ? selectedService.name : 'Service non sélectionné'}
        </h2>
        <Button variant="secondary" onClick={() => {
          setCurrentPage("services");
          setSelectedService(null);
          setIsCandidatesAccessible(false);
          setSelectedCandidate(null);
        }}>
          ← Retour aux services
        </Button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        {canUpdate && (
          <div style={appStyles.addButtonContainer}>
            <Button variant="primary" style={appStyles.button} onClick={() => setShowAddCandidateModal(true)}>
              Ajouter un candidat
            </Button>
          </div>
        )}
        <Form style={{ minWidth: 250, marginLeft: canUpdate ? 0 : 'auto' }}>
          <Form.Control
            type="text"
            placeholder="Rechercher un candidat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Form>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
        <Form.Select
          value={selectedYear}
          onChange={e => {
            setSelectedYear(e.target.value);
            setSelectedMonth(""); // Reset month when year changes
          }}
          style={{ width: 120 }}
        >
          <option value="">Année</option>
          {years.sort().map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </Form.Select>
        <Form.Select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          style={{ width: 120 }}
        >
          <option value="">Mois</option>
          {months.sort().map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </Form.Select>
        {showTypeEquivalence && (
          <Form.Select
            value={typeEquivalenceFilter}
            onChange={e => setTypeEquivalenceFilter(e.target.value)}
            style={{ width: 200 }}
          >
            <option value="">Type d'équivalence</option>
            {typeEquivalenceOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </Form.Select>
        )}
      </div>
      <Table
        striped
        bordered
        hover
        style={{
          ...appStyles.table,
          overflow: "visible"
        }}
      >
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            {showTypeEquivalence && <th>Type d'équivalence</th>}
            <th>Statut</th>
            <th>
              Date de création
              <Button
                variant="link"
                size="sm"
                style={{ padding: '0 2px', verticalAlign: 'middle' }}
                onClick={() => setSortOrder("asc")}
                aria-label="Trier croissant"
              >
                ▲
              </Button>
              <Button
                variant="link"
                size="sm"
                style={{ padding: '0 2px', verticalAlign: 'middle' }}
                onClick={() => setSortOrder("desc")}
                aria-label="Trier décroissant"
              >
                ▼
              </Button>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedCandidates.length === 0 ? (
            <tr>
              <td colSpan={showTypeEquivalence ? 6 : 5} className="text-center">
                Aucun candidat disponible pour ce service.
              </td>
            </tr>
          ) : (
            sortedCandidates.map((candidate) => (
              <tr key={candidate.id}>
                <td>
                  {candidate.firstName} {candidate.lastName}
                </td>
                <td>{candidate.email}</td>
                {showTypeEquivalence && <td>{candidate.type_equivalence || "-"}</td>}
                <td>{candidate.status}</td>
                <td>{candidate.createdAt ? candidate.createdAt.replace('T', ' ').slice(0, 19) : ''}</td>
                <td
                  style={{
                    ...appStyles.actionButtons,
                    position: "relative",
                    overflow: "visible"
                  }}
                >
                  <div style={{ display: "flex", gap: "4px" }}>
                    <Button
                      variant="info"
                      size="sm"
                      style={appStyles.button}
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        setCurrentPage("candidateDetails");
                      }}
                    >
                      Voir dossier
                    </Button>
                    <Button variant="success" size="sm" style={appStyles.button} onClick={() => generatePDF(candidate)}>
                      Générer PDF
                    </Button>
                    {canUpdate && (
                      <>
                    <Button
                      variant="secondary"
                      size="sm"
                      style={appStyles.button}
                      onClick={() => handleOpenCopyCandidate(candidate)}
                    >
                      Copier
                    </Button>
                    <DropdownButton
                      align="end"
                      container="body"
                      size="sm"
                      title="Se déplacer vers"
                      popperConfig={{
                        modifiers: [
                          {
                            name: "preventOverflow",
                            options: { boundary: document.body }
                          }
                        ]
                      }}
                    >
                      {services.map((service) => (
                        <Dropdown.Item
                          key={service.id}
                          onClick={() => handleMoveCandidate(candidate, service.id)}
                        >
                          {service.name}
                        </Dropdown.Item>
                      ))}
                    </DropdownButton>
                    <Button
                      variant="danger"
                      size="sm"
                      style={appStyles.button}
                      onClick={() => confirmDeleteCandidate(candidate.id)}
                    >
                      Supprimer
                    </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* Modal pour copier un candidat */}
      <Modal
        show={showCopyCandidateModal}
        onHide={() => {
          setShowCopyCandidateModal(false);
          setCandidateToCopy(null);
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Copier le candidat
            {candidateToCopy ? ` (${candidateToCopy.firstName} ${candidateToCopy.lastName})` : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {candidateToCopy && (
            <p className="text-muted mb-3">
              Les revenus ({candidateToCopy.revenues?.length || 0}) et dépenses ({candidateToCopy.expenses?.length || 0}) seront copiés vers le nouveau candidat.
            </p>
          )}
          {showCopyCandidateModal && (
            <CandidateForm
              key={candidateToCopy?.id}
              candidate={copyCandidate}
              onSave={handleCopyCandidate}
              onCancel={() => {
                setShowCopyCandidateModal(false);
                setCandidateToCopy(null);
              }}
              selectedService={selectedService}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Modal pour ajouter un candidat */}
      <Modal show={showAddCandidateModal} onHide={() => setShowAddCandidateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Ajouter un candidat</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CandidateForm
            candidate={newCandidate}
            onSave={handleAddCandidate}
            onCancel={() => setShowAddCandidateModal(false)}
            selectedService={selectedService}
          />
        </Modal.Body>
      </Modal>

      {/* Section des détails financiers pour chaque candidat */}
      {selectedCandidate && (
        <div>
          <h3>
            Détails financiers de {selectedCandidate.firstName} {selectedCandidate.lastName}
          </h3>
          <Card>
            <Card.Body>
              <p>
                <strong>Email :</strong> {selectedCandidate.email}
              </p>
              <p>
                <strong>Téléphone :</strong> {selectedCandidate.phone}
              </p>
              <p>
                <strong>Pays :</strong> {selectedCandidate.country}
              </p>
              <p>
                <strong>Statut :</strong> {selectedCandidate.status}
              </p>
              <Button
                variant="warning"
                size="sm"
                style={appStyles.button}
                onClick={() => {
                  setShowEditCandidateModal(true);
                }}
              >
                Modifier
              </Button>
            </Card.Body>
          </Card>
          <Row>
            <Col md={6} xs={12}>
              <h3>Revenus</h3>
              <Button variant="primary" size="sm" style={appStyles.button} onClick={() => setShowAddRevenueModal(true)}>
                + Ajouter
              </Button>
              <Table striped bordered hover style={appStyles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Montant HT (DT)</th>
                    <th>Montant TTC (DT)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCandidate.revenues.map((rev) => (
                    <tr key={rev.id}>
                      {/* ...revenue editing logic... */}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Col>
            <Col md={6} xs={12}>
              <h3>Dépenses</h3>
              <Button variant="primary" size="sm" style={appStyles.button} onClick={() => setShowAddExpenseModal(true)}>
                + Ajouter
              </Button>
              <Table striped bordered hover style={appStyles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Montant HT (DT)</th>
                    <th>Montant TTC (DT)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCandidate.expenses.map((exp) => (
                    <tr key={exp.id}>
                      {/* ...expense editing logic... */}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Col>
          </Row>
          <Card style={appStyles.card}>
            <Card.Body>
              <Card.Title>
                Solde :
                {/* ...balance calculation... */}
              </Card.Title>
              <Button variant="success" onClick={() => generatePDF(selectedCandidate)}>
                Générer PDF
              </Button>
            </Card.Body>
          </Card>
        </div>
      )}

      <Modal show={showDeleteCandidateModal} onHide={() => setShowDeleteCandidateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmer la suppression</Modal.Title>
        </Modal.Header>
        <Modal.Body>Êtes-vous sûr de vouloir supprimer ce candidat ?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteCandidateModal(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleConfirmDeleteCandidate}>
            Supprimer
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Candidates; 