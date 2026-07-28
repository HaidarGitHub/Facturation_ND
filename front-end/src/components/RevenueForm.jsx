import React, { useState, useEffect } from "react";
import { Form, Button, Modal } from "react-bootstrap";

const RevenueForm = ({ revenue, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    ...revenue,
    tva: revenue.tva || "",
    amountHT: revenue.amountHT || "",
    amountTTC: revenue.amountTTC || "",
    date: revenue.date || "",
    description: revenue.description || "",
  });
  const [errors, setErrors] = useState({});
  const [lastEditedField, setLastEditedField] = useState(null);

  // Calcul automatique bidirectionnel
  useEffect(() => {
    if (formData.tva !== undefined && formData.tva !== null && formData.tva !== "") {
      const tva = Number(formData.tva) || 0;
      
      if (lastEditedField === 'amountHT' && formData.amountHT) {
        // Calculer TTC à partir de HT
        const amountHT = Number(formData.amountHT) || 0;
        const amountTTC = amountHT * (1 + tva / 100);
        setFormData((prev) => ({
          ...prev,
          amountTTC: amountTTC.toFixed(2),
        }));
      } else if (lastEditedField === 'amountTTC' && formData.amountTTC) {
        // Calculer HT à partir de TTC
        const amountTTC = Number(formData.amountTTC) || 0;
        const amountHT = amountTTC / (1 + tva / 100);
        setFormData((prev) => ({
          ...prev,
          amountHT: amountHT.toFixed(2),
        }));
      }
    }
  }, [formData.amountHT, formData.amountTTC, formData.tva, lastEditedField]);

  // Accepte les entiers ou floats (point ou virgule)
  const validateAmount = (amount) => {
    return /^\d+(\.|,)?\d*$/.test(amount);
  };

  const handleChange = (e, field) => {
    let value = e.target.value;
    if (field === "amount" || field === "amountHT" || field === "amountTTC") {
      // Allow digits, decimal points, and commas
      value = value.replace(/[^\d.,]/g, "");
      // Replace comma with dot for consistency
      value = value.replace(",", ".");
      // Ensure only one decimal point
      const parts = value.split(".");
      if (parts.length > 2) {
        value = parts[0] + "." + parts.slice(1).join("");
      }
    }
    if (field === "tva") {
      value = value.replace(/[^\d.,]/g, "");
      value = value.replace(",", ".");
      value = value === "" ? "" : value;
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
    setLastEditedField(field);
  };

  const validateForm = () => {
    const newErrors = {};
    if (formData.amountHT && !validateAmount(formData.amountHT)) {
      newErrors.amountHT = "Le montant HT doit être un nombre";
    }
    if (formData.amountTTC && !validateAmount(formData.amountTTC)) {
      newErrors.amountTTC = "Le montant TTC doit être un nombre";
    }
    if (formData.tva && !validateAmount(formData.tva)) {
      newErrors.tva = "La TVA doit être un nombre";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const dataToSave = {
        ...formData,
        amount: formData.amount ?? null,
        amountHT: formData.amountHT ? formData.amountHT : null,
        amountTTC: formData.amountTTC ? formData.amountTTC : null,
        tva: formData.tva ? formData.tva : null,
      };
      console.log('RevenueForm - Sauvegarde avec TVA =', dataToSave.tva);
      onSave(dataToSave);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>Description de la transaction</Form.Label>
        <Form.Control
          type="text"
          value={formData.description}
          onChange={(e) => handleChange(e, "description")}
          isInvalid={!!errors.description}
        />
        <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Montant HT (DT)</Form.Label>
        <Form.Control
          type="text"
          value={formData.amountHT}
          onChange={(e) => handleChange(e, "amountHT")}
          isInvalid={!!errors.amountHT}
        />
        <Form.Control.Feedback type="invalid">{errors.amountHT}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group controlId="revenueTva">
        <Form.Label>TVA (%)</Form.Label>
        <Form.Control
          type="text"
          value={formData.tva}
          onChange={(e) => handleChange(e, "tva")}
          min={0}
          max={100}
          placeholder="TVA en %"
          isInvalid={!!errors.tva}
        />
        <Form.Control.Feedback type="invalid">{errors.tva}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Montant TTC (DT)</Form.Label>
        <Form.Control
          type="text"
          value={formData.amountTTC}
          onChange={(e) => handleChange(e, "amountTTC")}
          isInvalid={!!errors.amountTTC}
        />
        <Form.Control.Feedback type="invalid">{errors.amountTTC}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Date de transaction</Form.Label>
        <Form.Control
          type="date"
          value={formData.date}
          onChange={(e) => handleChange(e, "date")}
          isInvalid={!!errors.date}
        />
        <Form.Control.Feedback type="invalid">{errors.date}</Form.Control.Feedback>
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

export default RevenueForm;