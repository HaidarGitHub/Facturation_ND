import React, { useState } from "react";
import { Form, Button, Modal } from "react-bootstrap";

const CandidateForm = ({ candidate, onSave, onCancel, selectedService }) => {
  const [formData, setFormData] = useState(candidate);
  const [errors, setErrors] = useState({});
  const showTypeEquivalence = selectedService && selectedService.name === "Préparation des équivalences en Allemagne";

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\d+$/;
    return phoneRegex.test(phone);
  };

  const handleChange = (e, field) => {
    let value = e.target.value;
    if (field === "phone") {
      value = value.replace(/[^\d]/g, "");
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [field]: null,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName) {
      newErrors.firstName = "Le prénom est requis";
    }
    if (!formData.lastName) {
      newErrors.lastName = "Le nom est requis";
    }
    if (!formData.email) {
      newErrors.email = "L'email est requis";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Format d'email invalide";
    }
    if (!formData.phone) {
      newErrors.phone = "Le téléphone est requis";
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = "Le téléphone doit contenir uniquement des chiffres";
    }
    if (!formData.country) {
      newErrors.country = "Le pays est requis";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>Prénom</Form.Label>
        <Form.Control
          type="text"
          value={formData.firstName}
          onChange={(e) => handleChange(e, "firstName")}
          isInvalid={!!errors.firstName}
        />
        <Form.Control.Feedback type="invalid">{errors.firstName}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Nom</Form.Label>
        <Form.Control
          type="text"
          value={formData.lastName}
          onChange={(e) => handleChange(e, "lastName")}
          isInvalid={!!errors.lastName}
        />
        <Form.Control.Feedback type="invalid">{errors.lastName}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Email</Form.Label>
        <Form.Control
          type="email"
          value={formData.email}
          onChange={(e) => handleChange(e, "email")}
          isInvalid={!!errors.email}
        />
        <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Téléphone</Form.Label>
        <Form.Control
          type="text"
          value={formData.phone}
          onChange={(e) => handleChange(e, "phone")}
          placeholder="+XX-XXXXXXXXXX ou XXXXXXXXXX"
          isInvalid={!!errors.phone}
        />
        <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Pays</Form.Label>
        <Form.Control
          type="text"
          value={formData.country}
          onChange={(e) => handleChange(e, "country")}
          isInvalid={!!errors.country}
        />
        <Form.Control.Feedback type="invalid">{errors.country}</Form.Control.Feedback>
      </Form.Group>
      {showTypeEquivalence && (
        <Form.Group className="mb-3">
          <Form.Label>Type d'équivalence</Form.Label>
          <Form.Control
            type="text"
            value={formData.type_equivalence || ""}
            onChange={(e) => handleChange(e, "type_equivalence")}
            placeholder="Saisir le type d'équivalence"
          />
        </Form.Group>
      )}
      <Form.Group className="mb-3">
        <Form.Label>Statut</Form.Label>
        <Form.Select value={formData.status} onChange={(e) => handleChange(e, "status")}> 
          <option value="En cours">En cours</option>
          <option value="Terminé">Terminé</option>
          <option value="Refusé">Refusé</option>
        </Form.Select>
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

export default CandidateForm; 