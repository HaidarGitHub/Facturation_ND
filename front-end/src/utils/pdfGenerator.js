// utils/pdfGenerator.js
import jsPDF from "jspdf";

export const generateCandidatePDF = (candidateData) => {
  const doc = new jsPDF();
  doc.text(`Dossier Candidat: ${candidateData.name}`, 10, 10);
  doc.text(`Revenus: ${candidateData.revenues} €`, 10, 20);
  doc.text(`Dépenses: ${candidateData.expenses} €`, 10, 30);
  doc.save(`dossier-${candidateData.id}.pdf`);
};