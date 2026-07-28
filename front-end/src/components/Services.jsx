import React from "react";
import { Container, Row, Col, Card, Button, Form, Modal } from "react-bootstrap";
import ServiceForm from "./ServiceForm";

const Services = ({
  appStyles,
  services,
  isAdmin,
  selectedServiceId,
  setSelectedServiceId,
  setShowAddServiceModal,
  setShowEditServiceModal,
  handleAddService,
  handleEditService,
  handleDeleteService,
  handleServiceSelect,
  showAddServiceModal,
  showEditServiceModal
}) => (
  <Container fluid style={appStyles.container}>
    <h2 style={appStyles.heading}>Nos Services</h2>
    {isAdmin && (
      <div style={appStyles.addButtonContainer}>
        <Button variant="primary" style={appStyles.button} onClick={() => setShowAddServiceModal(true)}>
          + Ajouter un service
        </Button>
        <Form.Select style={appStyles.serviceSelect} value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
          <option value="">Sélectionner un service</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </Form.Select>
        <Button
          variant="warning"
          style={appStyles.button}
          disabled={!selectedServiceId}
          onClick={() => {
            if (selectedServiceId) {
              setShowEditServiceModal(true);
            }
          }}
        >
          Modifier
        </Button>
        <Button variant="danger" style={appStyles.button} disabled={!selectedServiceId} onClick={handleDeleteService}>
          Supprimer
        </Button>
      </div>
    )}
    {services.length === 0 ? (
      <p className="text-muted">Aucun service accessible avec votre compte.</p>
    ) : (
    <Row xs={1} md={2} lg={3} className="g-4">
      {services.map((s) => (
        <Col key={s.id}>
          <Card
            style={appStyles.card}
            onClick={() => handleServiceSelect(s)}
            className="h-100"
            onMouseEnter={(e) => (e.currentTarget.style.transform = appStyles.serviceCardHover.transform)}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            <Card.Body style={appStyles.serviceCard}>
              <Card.Title className="text-center">{s.name}</Card.Title>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
    )}

    {/* Modal pour ajouter un service */}
    <Modal show={showAddServiceModal} onHide={() => setShowAddServiceModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Ajouter un service</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ServiceForm onSave={handleAddService} onCancel={() => setShowAddServiceModal(false)} />
      </Modal.Body>
    </Modal>

    {/* Modal pour modifier un service */}
    <Modal show={showEditServiceModal} onHide={() => setShowEditServiceModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Modifier un service</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ServiceForm
          service={services.find((s) => s.id === parseInt(selectedServiceId)) || { name: "" }}
          onSave={handleEditService}
          onCancel={() => {
            setShowEditServiceModal(false);
            setSelectedServiceId("");
          }}
        />
      </Modal.Body>
    </Modal>
  </Container>
);

export default Services; 