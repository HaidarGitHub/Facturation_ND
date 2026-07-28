import React, { useState } from "react";
import { Form, Button, Modal } from "react-bootstrap";

const ServiceForm = ({ service = { name: "" }, onSave, onCancel }) => {
  const [serviceName, setServiceName] = useState(service.name);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!serviceName) {
      newErrors.serviceName = "Le nom du service est requis";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave({ ...service, name: serviceName });
      setServiceName("");
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>Nom du service</Form.Label>
        <Form.Control
          type="text"
          value={serviceName}
          onChange={(e) => {
            setServiceName(e.target.value);
            if (errors.serviceName) {
              setErrors({ serviceName: null });
            }
          }}
          isInvalid={!!errors.serviceName}
        />
        <Form.Control.Feedback type="invalid">{errors.serviceName}</Form.Control.Feedback>
      </Form.Group>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button variant="primary" type="submit">
          Enregistrer
        </Button>
      </Modal.Footer>
    </Form>
  );
};

export default ServiceForm; 