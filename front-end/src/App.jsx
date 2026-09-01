import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Navbar, Nav, Card, Button, Form, Table, Modal, Dropdown, DropdownButton } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { jsPDF } from "jspdf";
import api from "./utils/api";
import {
  isAuthenticated as checkAuth,
  isAdmin,
  getUsername,
  clearAuth,
  getAccessibleServices,
  canUpdateService,
  canViewGeneralExpenses,
  canUpdateGeneralExpenses,
} from "./utils/auth";
import AdminPanel from "./components/AdminPanel";
import CandidateForm from "./components/CandidateForm";
import RevenueForm from "./components/RevenueForm";
import ExpenseForm from "./components/ExpenseForm";
import ServiceForm from "./components/ServiceForm";
import Services from "./components/Services";
import Candidates from "./components/Candidates";
import CandidateDetails from "./components/CandidateDetails";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";

// Import API configuration
import { API_BASE_URL } from './config';

function App() {
  const [candidates, setCandidates] = useState([]);
  const [currentPage, setCurrentPage] = useState("services");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [showAddRevenueModal, setShowAddRevenueModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [showCopyCandidateModal, setShowCopyCandidateModal] = useState(false);
  const [candidateToCopy, setCandidateToCopy] = useState(null);
  const [copyCandidate, setCopyCandidate] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    status: "En cours",
    createdAt: new Date().toISOString().slice(0, 16),
    service_id: null,
    type_equivalence: ""
  });
  const [showEditCandidateModal, setShowEditCandidateModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [isCandidatesAccessible, setIsCandidatesAccessible] = useState(false);
  const [services, setServices] = useState([]);
  const [newRevenue, setNewRevenue] = useState({ description: "", amount: "", amountHT: "", amountTTC: "", date: "" });
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", amountHT: "", amountTTC: "", date: "" });
  const [newCandidate, setNewCandidate] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    status: "En cours",
    createdAt: new Date().toISOString().slice(0, 16),
    service_id: null,
    type_equivalence: ""
  });
  const [editCandidate, setEditCandidate] = useState({
    id: null,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    status: "En cours",
    createdAt: new Date().toISOString().slice(0, 16),
    service_id: null,
    type_equivalence: ""
  });
  const [editingRevenueId, setEditingRevenueId] = useState(null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editRevenueData, setEditRevenueData] = useState({ id: null, description: "", amount: "", amountHT: "", amountTTC: "", date: "" });
  const [editExpenseData, setEditExpenseData] = useState({ id: null, description: "", amount: "", amountHT: "", amountTTC: "", date: "" });
  const [generalExpenses, setGeneralExpenses] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalCandidates: 0,
    totalServices: 0,
    totalRevenueHT: 0,
    totalRevenue: 0,
    totalExpensesHT: 0,
    totalExpenses: 0,
    serviceStats: [],
  });
  const [dashboardYear, setDashboardYear] = useState("");
  const [dashboardMonth, setDashboardMonth] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuth());
  const userIsAdmin = isAdmin();
  const userCanViewGeneralExpenses = canViewGeneralExpenses();
  const userCanUpdateGeneralExpenses = canUpdateGeneralExpenses();
  const username = getUsername();
  const [logoutMessage, setLogoutMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({ current: '', new: '', confirm: '' });
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');

  const getRouteFromPage = (page) => {
    switch (page) {
      case "admin":
        return "/admin";
      case "dashboard":
        return "/dashboard";
      case "candidates":
        return "/candidates";
      case "candidateDetails":
        return "/candidate-details";
      case "services":
      default:
        return "/services";
    }
  };

  const getPageFromPath = (pathname) => {
    switch (pathname) {
      case "/admin":
        return "admin";
      case "/dashboard":
        return "dashboard";
      case "/candidates":
        return "candidates";
      case "/candidate-details":
        return "candidateDetails";
      case "/services":
      default:
        return "services";
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    setLogoutMessage('');
    window.location.reload();
  };

  const handleLogout = () => {
    clearAuth();
    setIsAuthenticated(false);
    setLogoutMessage('Vous avez été déconnecté.');
    window.location.reload();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');
    if (changePasswordData.new !== changePasswordData.confirm) {
      setChangePasswordError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    try {
      await api.post(`${API_BASE_URL}/change-password`, {
        current_password: changePasswordData.current,
        new_password: changePasswordData.new
      });
      setChangePasswordSuccess('Mot de passe changé avec succès.');
      setChangePasswordData({ current: '', new: '', confirm: '' });
    } catch (err) {
      setChangePasswordError(err.response?.data?.message || 'Erreur lors du changement de mot de passe.');
    }
  };

  const refreshDashboardStats = async () => {
    try {
      const params = new URLSearchParams();
      if (dashboardYear) params.set("year", dashboardYear);
      if (dashboardMonth) params.set("month", dashboardMonth);
      const dashboardQuery = params.toString() ? `?${params.toString()}` : "";

      const calls = [api.get(`${API_BASE_URL}/services`)];
      if (userIsAdmin || userCanViewGeneralExpenses) {
        calls.push(api.get(`${API_BASE_URL}/dashboard${dashboardQuery}`));
        calls.push(api.get(`${API_BASE_URL}/general-expenses`));
      }
      const [servicesResponse, dashboardResponse, generalExpensesResponse] = await Promise.all(calls);
      setServices(getAccessibleServices(servicesResponse.data));
      if (userIsAdmin || userCanViewGeneralExpenses) {
        setGeneralExpenses(generalExpensesResponse.data);
        setDashboardStats({
          totalCandidates: dashboardResponse.data.totalCandidates,
          totalServices: dashboardResponse.data.totalServices,
          totalRevenueHT: dashboardResponse.data.totalRevenueHT,
          totalRevenue: dashboardResponse.data.totalRevenue,
          totalExpensesHT: dashboardResponse.data.totalExpensesHT,
          totalExpenses: dashboardResponse.data.totalExpenses,
          serviceStats: dashboardResponse.data.serviceStats,
        });
      }
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des statistiques :", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshDashboardStats();
    }
  }, [isAuthenticated, dashboardYear, dashboardMonth, userIsAdmin, userCanViewGeneralExpenses]);

  useEffect(() => {
    const initialPage = getPageFromPath(window.location.pathname);
    setCurrentPage(initialPage);
  }, []);

  useEffect(() => {
    const nextPath = getRouteFromPage(currentPage);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }, [currentPage]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getPageFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (selectedService) {
      const fetchCandidates = async () => {
        try {
          const response = await api.get(`${API_BASE_URL}/candidates?service_id=${selectedService.id}`);
          setCandidates([...response.data]);
        } catch (error) {
          console.error("Erreur lors du chargement des candidats :", error);
          alert("Erreur lors du chargement des candidats. Veuillez vérifier le serveur.");
        }
      };
      fetchCandidates();
    } else {
      setCandidates([]);
    }
  }, [selectedService]);

  const handleAddService = async (newService) => {
    try {
      await api.post(`${API_BASE_URL}/services`, newService);
      const servicesResponse = await api.get(`${API_BASE_URL}/services`);
      setServices(servicesResponse.data);
      setShowAddServiceModal(false);
      await refreshDashboardStats();
      alert("Service ajouté avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'ajout du service :", error);
      alert("Erreur lors de l'ajout du service : " + (error.response?.data?.message || error.message));
    }
  };

  const handleEditService = async (updatedService) => {
    try {
      await api.put(`${API_BASE_URL}/services/${updatedService.id}`, updatedService);
      const servicesResponse = await api.get(`${API_BASE_URL}/services`);
      setServices(servicesResponse.data);
      setShowEditServiceModal(false);
      setSelectedServiceId("");
      await refreshDashboardStats();
      alert("Service modifié avec succès !");
    } catch (error) {
      console.error("Erreur lors de la modification du service :", error);
      alert("Erreur lors de la modification du service : " + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteService = async () => {
    if (!selectedServiceId) {
      alert("Veuillez sélectionner un service à supprimer.");
      return;
    }
    const serviceToDelete = services.find((s) => s.id === parseInt(selectedServiceId));
    if (
      window.confirm(
        `Voulez-vous vraiment supprimer le service "${serviceToDelete.name}" ?`
      )
    ) {
      try {
        await api.delete(`${API_BASE_URL}/services/${selectedServiceId}`);
        const servicesResponse = await api.get(`${API_BASE_URL}/services`);
        setServices(servicesResponse.data);
        setSelectedServiceId("");
        await refreshDashboardStats();
        alert("Service supprimé avec succès !");
      } catch (error) {
        console.error("Erreur lors de la suppression du service :", error);
        alert("Erreur lors de la suppression du service : " + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setIsCandidatesAccessible(true);
    setCurrentPage("candidates");
  };

  const handleMoveCandidate = async (candidate, newServiceId) => {
    try {
      const { id, ...candidateData } = candidate;
      await api.post(`${API_BASE_URL}/candidates`, {
        ...candidateData,
        service_id: newServiceId,
      });
      const response = await api.get(`${API_BASE_URL}/candidates?service_id=${selectedService.id}`);
      setCandidates([...response.data]);
      await refreshDashboardStats();
      alert("Candidat copié avec succès !");
    } catch (error) {
      console.error("Erreur lors de la copie du candidat :", error);
      alert("Erreur lors de la copie du candidat : " + (error.response?.data?.message || error.message));
    }
  };

  const handleAddRevenue = async (formData) => {
    try {
      await api.post(`${API_BASE_URL}/candidates/${selectedCandidate.id}/revenues`, formData);
      const response = await api.get(`${API_BASE_URL}/candidates?service_id=${selectedService.id}`);
      setCandidates([...response.data]);
      setShowAddRevenueModal(false);
      setNewRevenue({ description: "", amount: "", amountHT: "", amountTTC: "", date: "" });
      const updatedCandidate = response.data.find(c => c.id === selectedCandidate.id);
      setSelectedCandidate(updatedCandidate);
      await refreshDashboardStats();
      alert("Revenu ajouté avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'ajout du revenu :", error);
      alert("Erreur lors de l'ajout du revenu : " + (error.response?.data?.message || error.message));
    }
  };

  const handleAddExpense = async (formData) => {
    try {
      await api.post(`${API_BASE_URL}/candidates/${selectedCandidate.id}/expenses`, formData);
      const response = await api.get(`${API_BASE_URL}/candidates?service_id=${selectedService.id}`);
      setCandidates([...response.data]);
      setShowAddExpenseModal(false);
      setNewExpense({ description: "", amount: "", amountHT: "", amountTTC: "", date: "" });
      const updatedCandidate = response.data.find(c => c.id === selectedCandidate.id);
      setSelectedCandidate(updatedCandidate);
      await refreshDashboardStats();
      alert("Dépense ajoutée avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'ajout de la dépense :", error);
      alert("Erreur lors de l'ajout de la dépense : " + (error.response?.data?.message || error.message));
    }
  };

  const handleAddGeneralExpense = async (formData) => {
    try {
      await api.post(`${API_BASE_URL}/general-expenses`, formData);
      const response = await api.get(`${API_BASE_URL}/general-expenses`);
      setGeneralExpenses(response.data);
      await refreshDashboardStats();
      alert("Dépense générale ajoutée avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'ajout de la dépense générale :", error);
      alert("Erreur lors de l'ajout de la dépense générale : " + (error.response?.data?.message || error.message));
    }
  };

  const handleEditGeneralExpense = async (id, formData) => {
    try {
      await api.put(`${API_BASE_URL}/general-expenses/${id}`, formData);
      const response = await api.get(`${API_BASE_URL}/general-expenses`);
      setGeneralExpenses(response.data);
      await refreshDashboardStats();
      alert("Dépense générale modifiée avec succès !");
    } catch (error) {
      console.error("Erreur lors de la modification de la dépense générale :", error);
      alert("Erreur lors de la modification de la dépense générale : " + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteGeneralExpense = async (id) => {
    try {
      await api.delete(`${API_BASE_URL}/general-expenses/${id}`);
      const response = await api.get(`${API_BASE_URL}/general-expenses`);
      setGeneralExpenses(response.data);
      await refreshDashboardStats();
      alert("Dépense générale supprimée avec succès !");
    } catch (error) {
      console.error("Erreur lors de la suppression de la dépense générale :", error);
      alert("Erreur lors de la suppression de la dépense générale : " + (error.response?.data?.message || error.message));
    }
  };

  const emptyCandidateForm = () => ({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    status: "En cours",
    createdAt: new Date().toISOString().slice(0, 16),
    service_id: selectedService ? selectedService.id : null,
    type_equivalence: ""
  });

  const handleOpenCopyCandidate = (candidate) => {
    setCandidateToCopy(candidate);
    setCopyCandidate(emptyCandidateForm());
    setShowCopyCandidateModal(true);
  };

  const handleCopyCandidate = async (formData) => {
    try {
      const candidateData = {
        ...formData,
        service_id: selectedService.id
      };
      const response = await api.post(`${API_BASE_URL}/candidates`, candidateData);
      const newCandidateId = response.data.id;

      if (candidateToCopy) {
        for (const rev of candidateToCopy.revenues || []) {
          await api.post(`${API_BASE_URL}/candidates/${newCandidateId}/revenues`, {
            description: rev.description,
            amount: rev.amount,
            amountHT: rev.amountHT,
            amountTTC: rev.amountTTC,
            tva: rev.tva,
            date: rev.date,
          });
        }
        for (const exp of candidateToCopy.expenses || []) {
          await api.post(`${API_BASE_URL}/candidates/${newCandidateId}/expenses`, {
            description: exp.description,
            amount: exp.amount,
            amountHT: exp.amountHT,
            amountTTC: exp.amountTTC,
            tva: exp.tva,
            date: exp.date,
          });
        }
      }

      const candidatesResponse = await api.get(`${API_BASE_URL}/candidates?service_id=${selectedService.id}`);
      setCandidates([...candidatesResponse.data].reverse());
      setShowCopyCandidateModal(false);
      setCandidateToCopy(null);
      setCopyCandidate(emptyCandidateForm());
      await refreshDashboardStats();
      alert("Candidat copié avec succès !");
    } catch (error) {
      console.error("Erreur lors de la copie du candidat :", error);
      alert("Erreur lors de la copie du candidat : " + (error.response?.data?.message || error.message));
    }
  };

  const handleAddCandidate = async (formData) => {
    try {
      const candidateData = {
        ...formData,
        createdAt: formData.createdAt || new Date().toISOString().slice(0, 16),
        service_id: selectedService.id
      };
      await api.post(`${API_BASE_URL}/candidates`, candidateData);
      const candidatesResponse = await api.get(`${API_BASE_URL}/candidates?service_id=${selectedService.id}`);
      setCandidates([...candidatesResponse.data].reverse());
      setShowAddCandidateModal(false);
      setNewCandidate({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        country: "",
        status: "En cours",
        createdAt: new Date().toISOString().slice(0, 16),
        service_id: selectedService ? selectedService.id : null,
        type_equivalence: ""
      });
      await refreshDashboardStats();
      alert("Candidat ajouté avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'ajout du candidat :", error);
      alert("Erreur lors de l'ajout du candidat : " + (error.response?.data?.message || error.message));
    }
  };

  const handleEditCandidate = async (formData) => {
    try {
      const candidateData = {
        ...formData,
        service_id: selectedService.id
      };
      await api.put(`${API_BASE_URL}/candidates/${formData.id}`, candidateData);
      const response = await api.get(`${API_BASE_URL}/candidates?service_id=${selectedService.id}`);
      setCandidates([...response.data]);
      setSelectedCandidate(response.data.find((c) => c.id === formData.id));
      setShowEditCandidateModal(false);
      setEditCandidate({
        id: null,
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        country: "",
        status: "En cours",
        createdAt: new Date().toISOString().slice(0, 16),
        service_id: selectedService ? selectedService.id : null,
        type_equivalence: ""
      });
      await refreshDashboardStats();
      alert("Candidat modifié avec succès !");
    } catch (error) {
      console.error("Erreur lors de la modification du candidat :", error);
      alert("Erreur lors de la modification du candidat : " + (error.response?.data?.message || error.message));
    }
  };

  // Modifier un revenu inline
  const handleEditRevenue = (id) => {
    const revenue = selectedCandidate.revenues.find((rev) => rev.id === id);
    setEditingRevenueId(id);
    setEditRevenueData({
      id,
      description: revenue.description,
      amount: revenue.amount,
      amountHT: revenue.amountHT,
      amountTTC: revenue.amountTTC,
      tva: revenue.tva,
      date: revenue.date,
    });
  };

  const handleSaveRevenue = async (id) => {
    try {
      await api.put(`${API_BASE_URL}/revenues/${id}`, editRevenueData);
      const response = await api.get(`${API_BASE_URL}/candidates?service_id=${selectedService.id}`);
      setCandidates([...response.data]);
      setEditingRevenueId(null);
      setEditRevenueData({ id: null, description: "", amount: "", amountHT: "", amountTTC: "", date: "" });
      const updatedCandidate = response.data.find(c => c.id === selectedCandidate.id);
      setSelectedCandidate(updatedCandidate);
      await refreshDashboardStats();
      alert("Revenu modifié avec succès !");
    } catch (error) {
      console.error("Erreur lors de la modification du revenu :", error);
      alert("Erreur lors de la modification du revenu : " + (error.response?.data?.message || error.message));
    }
  };

  const handleEditExpense = (id) => {
    const expense = selectedCandidate.expenses.find((exp) => exp.id === id);
    setEditingExpenseId(id);
    setEditExpenseData({
      id,
      description: expense.description,
      amount: expense.amount,
      amountHT: expense.amountHT,
      amountTTC: expense.amountTTC,
      tva: expense.tva,
      date: expense.date,
    });
  };

  const handleSaveExpense = async (id) => {
    try {
      await api.put(`${API_BASE_URL}/expenses/${id}`, editExpenseData);
      const response = await api.get(`${API_BASE_URL}/candidates?service_id=${selectedService.id}`);
      setCandidates([...response.data]);
      setEditingExpenseId(null);
      setEditExpenseData({ id: null, description: "", amount: "", amountHT: "", amountTTC: "", date: "" });
      const updatedCandidate = response.data.find(c => c.id === selectedCandidate.id);
      setSelectedCandidate(updatedCandidate);
      await refreshDashboardStats();
      alert("Dépense modifiée avec succès !");
    } catch (error) {
      console.error("Erreur lors de la modification de la dépense :", error);
      alert("Erreur lors de la modification de la dépense : " + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteRevenue = async (id) => {
    try {
      await api.delete(`${API_BASE_URL}/revenues/${id}`);
      const response = await api.get(`${API_BASE_URL}/candidates?service_id=${selectedService.id}`);
      setCandidates([...response.data]);
      const updatedCandidate = response.data.find(c => c.id === selectedCandidate.id);
      setSelectedCandidate(updatedCandidate);
      await refreshDashboardStats();
      alert("Revenu supprimé avec succès !");
    } catch (error) {
      console.error("Erreur lors de la suppression du revenu :", error);
      alert("Erreur lors de la suppression du revenu : " + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await api.delete(`${API_BASE_URL}/expenses/${id}`);
      const response = await api.get(`${API_BASE_URL}/candidates?service_id=${selectedService.id}`);
      setCandidates([...response.data]);
      const updatedCandidate = response.data.find(c => c.id === selectedCandidate.id);
      setSelectedCandidate(updatedCandidate);
      await refreshDashboardStats();
      alert("Dépense supprimée avec succès !");
    } catch (error) {
      console.error("Erreur lors de la suppression de la dépense :", error);
      alert("Erreur lors de la suppression de la dépense : " + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteCandidate = async (id) => {
    try {
      await api.delete(`${API_BASE_URL}/candidates/${id}`);
      const response = await api.get(`${API_BASE_URL}/candidates?service_id=${selectedService.id}`);
      setCandidates([...response.data]);
      if (selectedCandidate?.id === id) setSelectedCandidate(null);
      await refreshDashboardStats();
      alert("Candidat supprimé avec succès !");
    } catch (error) {
      console.error("Erreur lors de la suppression du candidat :", error);
      alert("Erreur lors de la suppression du candidat : " + (error.response?.data?.message || error.message));
    }
  };

  const generatePDF = (candidate) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Dossier de ${candidate.firstName} ${candidate.lastName}`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Email: ${candidate.email}`, 20, 30);
    doc.text(`Téléphone: ${candidate.phone}`, 20, 40);
    doc.text(`Pays: ${candidate.country}`, 20, 50);
    doc.text(`Statut: ${candidate.status}`, 20, 60);
    doc.text(`Service: ${candidate.serviceName || ''}`, 20, 70);
    doc.text("Revenus:", 20, 85);
    let y = 95;
    candidate.revenues.forEach((rev) => {
      doc.text(`Date: ${rev.date || ''}`, 30, y);
      doc.text(`Type: Income`, 80, y);
      doc.text(`Montant HT: ${rev.amountHT || ''} DT`, 120, y);
      doc.text(`TVA: ${rev.tva || ''} %`, 30, y + 7);
      doc.text(`Montant TTC: ${rev.amountTTC || ''} DT`, 80, y + 7);
      doc.text(`Description: ${rev.description || ''}`, 120, y + 7);
      y += 15;
    });
    doc.text("Dépenses:", 20, y);
    y += 10;
    candidate.expenses.forEach((exp) => {
      doc.text(`Date: ${exp.date || ''}`, 30, y);
      doc.text(`Type: Outcome`, 80, y);
      doc.text(`Montant HT: ${exp.amountHT || ''} DT`, 120, y);
      doc.text(`TVA: ${exp.tva || ''} %`, 30, y + 7);
      doc.text(`Montant TTC: ${exp.amountTTC || ''} DT`, 80, y + 7);
      doc.text(`Description: ${exp.description || ''}`, 120, y + 7);
      y += 15;
    });
    doc.save(`${candidate.firstName}_${candidate.lastName}_dossier.pdf`);
  };

  const handleSaveNote = async (candidateId, note) => {
    try {
      const candidate = candidates.find(c => c.id === candidateId);
      if (!candidate) return;
      const candidateData = {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone,
        country: candidate.country,
        status: candidate.status,
        service_id: candidate.service_id,
        note: note
      };
      await api.put(`${API_BASE_URL}/candidates/${candidateId}`, candidateData);
      const response = await api.get(`${API_BASE_URL}/candidates?service_id=${selectedService.id}`);
      setCandidates([...response.data]);
      setSelectedCandidate(response.data.find(c => c.id === candidateId));
    } catch (error) {
      alert("Erreur lors de la sauvegarde de la note : " + (error.response?.data?.message || error.message));
    }
  };

  // Styles personnalisés
  const appStyles = {
    container: {
      padding: "20px",
      minHeight: "100vh",
      backgroundColor: "#f8f9fa",
    },
    card: {
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      marginBottom: "20px",
    },
    table: {
      backgroundColor: "#fff",
      borderRadius: "8px",
      overflow: "hidden",
    },
    button: {
      marginRight: "10px",
    },
    actionButtons: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
    },
    heading: {
      fontSize: "1.75rem",
      marginBottom: "20px",
    },
    addButtonContainer: {
      marginBottom: "30px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    input: {
      width: "100%",
    },
    serviceCard: {
      cursor: "pointer",
      transition: "transform 0.2s",
    },
    serviceCardHover: {
      transform: "scale(1.02)",
    },
    serviceSelect: {
      maxWidth: "300px",
    },
  };

  if (!isAuthenticated) {
    return (
      <>
        {logoutMessage && <div style={{ color: 'green', textAlign: 'center', marginTop: 20 }}>{logoutMessage}</div>}
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <div>
      <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
        <Container>
          <Navbar.Brand href="#services">Facturation Candidats</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navlg-nav" />
          <Navbar.Collapse id="basic-navlg-nav">
            <Nav className="me-auto">
              {(userIsAdmin || userCanViewGeneralExpenses) && (
                <Nav.Link onClick={() => setCurrentPage("dashboard")} active={currentPage === "dashboard"}>
                  Tableau de Bord
                </Nav.Link>
              )}
              <Nav.Link
                onClick={() => setCurrentPage("services")}
                active={currentPage === "services"}
                disabled={selectedCandidate !== null}
                style={{ opacity: selectedCandidate !== null ? 0.5 : 1, cursor: selectedCandidate !== null ? 'not-allowed' : 'pointer' }}
              >
                Services
              </Nav.Link>
              <Nav.Link
                onClick={() => {
                  if (isCandidatesAccessible) {
                    setCurrentPage("candidates");
                  } else {
                    alert("Veuillez sélectionner un service d'abord.");
                  }
                }}
                active={currentPage === "candidates"}
                disabled={!isCandidatesAccessible}
              >
                Candidats{selectedService ? ` - ${selectedService.name}` : ''}
              </Nav.Link>
              {userIsAdmin && (
                <Nav.Link onClick={() => setCurrentPage("admin")} active={currentPage === "admin"}>
                  Administration
                </Nav.Link>
              )}
            </Nav>
            <Nav className="ms-auto align-items-center" style={{ gap: 10 }}>
              {username && (
                <span className="text-light" style={{ opacity: 0.8 }}>
                  {username}
                </span>
              )}
              <Button variant="outline-light" onClick={() => setShowChangePassword(true)}>
                Changer le mot de passe
              </Button>
              <Button variant="outline-light" onClick={handleLogout}>
                Logout
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Modal show={showChangePassword} onHide={() => setShowChangePassword(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Changer le mot de passe</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleChangePassword}>
            <div className="mb-3">
              <label>Mot de passe actuel</label>
              <input
                type="password"
                className="form-control"
                value={changePasswordData.current}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, current: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label>Nouveau mot de passe</label>
              <input
                type="password"
                className="form-control"
                value={changePasswordData.new}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, new: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label>Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                className="form-control"
                value={changePasswordData.confirm}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, confirm: e.target.value })}
                required
              />
            </div>

            {changePasswordError && <div style={{ color: "red", marginBottom: 10 }}>{changePasswordError}</div>}
            {changePasswordSuccess && <div style={{ color: "green", marginBottom: 10 }}>{changePasswordSuccess}</div>}

            <Button type="submit" variant="primary" style={{ width: "100%" }}>
              Valider
            </Button>
          </form>
        </Modal.Body>
      </Modal>

      <Container fluid>
        {currentPage === "dashboard" && (userIsAdmin || userCanViewGeneralExpenses) && (
          <Dashboard
            appStyles={appStyles}
            dashboardStats={dashboardStats}
            generalExpenses={generalExpenses}
            selectedYear={dashboardYear}
            setSelectedYear={setDashboardYear}
            selectedMonth={dashboardMonth}
            setSelectedMonth={setDashboardMonth}
            onAddGeneralExpense={handleAddGeneralExpense}
            onEditGeneralExpense={handleEditGeneralExpense}
            onDeleteGeneralExpense={handleDeleteGeneralExpense}
            canModifyGeneralExpenses={userIsAdmin || userCanUpdateGeneralExpenses}
            showFullDashboard={userIsAdmin}
          />
        )}

        {currentPage === "admin" && userIsAdmin && (
          <AdminPanel appStyles={appStyles} services={services} />
        )}

        {currentPage === "services" && (
          <Services
            appStyles={appStyles}
            services={services}
            isAdmin={userIsAdmin}
            selectedServiceId={selectedServiceId}
            setSelectedServiceId={setSelectedServiceId}
            setShowAddServiceModal={setShowAddServiceModal}
            setShowEditServiceModal={setShowEditServiceModal}
            handleAddService={handleAddService}
            handleEditService={handleEditService}
            handleDeleteService={handleDeleteService}
            handleServiceSelect={handleServiceSelect}
            showAddServiceModal={showAddServiceModal}
            showEditServiceModal={showEditServiceModal}
          />
        )}

        {currentPage === "candidates" && !selectedCandidate && (
          <Candidates
            appStyles={appStyles}
            candidates={candidates}
            selectedService={selectedService}
            canUpdate={selectedService ? canUpdateService(selectedService.id) : false}
            setCurrentPage={setCurrentPage}
            setSelectedService={setSelectedService}
            setIsCandidatesAccessible={setIsCandidatesAccessible}
            setSelectedCandidate={setSelectedCandidate}
            showAddCandidateModal={showAddCandidateModal}
            setShowAddCandidateModal={setShowAddCandidateModal}
            newCandidate={newCandidate}
            handleAddCandidate={handleAddCandidate}
            selectedCandidate={selectedCandidate}
            setShowEditCandidateModal={setShowEditCandidateModal}
            editCandidate={editCandidate}
            handleEditCandidate={handleEditCandidate}
            showEditCandidateModal={showEditCandidateModal}
            handleDeleteCandidate={handleDeleteCandidate}
            services={services}
            handleMoveCandidate={handleMoveCandidate}
            handleOpenCopyCandidate={handleOpenCopyCandidate}
            handleCopyCandidate={handleCopyCandidate}
            showCopyCandidateModal={showCopyCandidateModal}
            setShowCopyCandidateModal={setShowCopyCandidateModal}
            candidateToCopy={candidateToCopy}
            setCandidateToCopy={setCandidateToCopy}
            copyCandidate={copyCandidate}
            generatePDF={generatePDF}
            editingRevenueId={editingRevenueId}
            editRevenueData={editRevenueData}
            setEditRevenueData={setEditRevenueData}
            handleEditRevenue={handleEditRevenue}
            handleSaveRevenue={handleSaveRevenue}
            handleDeleteRevenue={handleDeleteRevenue}
            showAddRevenueModal={showAddRevenueModal}
            setShowAddRevenueModal={setShowAddRevenueModal}
            newRevenue={newRevenue}
            handleAddRevenue={handleAddRevenue}
            editingExpenseId={editingExpenseId}
            editExpenseData={editExpenseData}
            setEditExpenseData={setEditExpenseData}
            handleEditExpense={handleEditExpense}
            handleSaveExpense={handleSaveExpense}
            handleDeleteExpense={handleDeleteExpense}
            showAddExpenseModal={showAddExpenseModal}
            setShowAddExpenseModal={setShowAddExpenseModal}
            newExpense={newExpense}
            handleAddExpense={handleAddExpense}
          />
        )}

        {currentPage === "candidates" && selectedCandidate && (
          <CandidateDetails
            appStyles={appStyles}
            selectedCandidate={selectedCandidate}
            selectedService={selectedService}
            canUpdate={selectedService ? canUpdateService(selectedService.id) : false}
            setCurrentPage={setCurrentPage}
            setSelectedCandidate={setSelectedCandidate}
            setShowEditCandidateModal={setShowEditCandidateModal}
            setEditCandidate={setEditCandidate}
            handleEditCandidate={handleEditCandidate}
            showEditCandidateModal={showEditCandidateModal}
            editCandidate={editCandidate}
            editingRevenueId={editingRevenueId}
            setEditingRevenueId={setEditingRevenueId}
            editRevenueData={editRevenueData}
            setEditRevenueData={setEditRevenueData}
            handleEditRevenue={handleEditRevenue}
            handleSaveRevenue={handleSaveRevenue}
            handleDeleteRevenue={handleDeleteRevenue}
            showAddRevenueModal={showAddRevenueModal}
            setShowAddRevenueModal={setShowAddRevenueModal}
            newRevenue={newRevenue}
            handleAddRevenue={handleAddRevenue}
            editingExpenseId={editingExpenseId}
            setEditingExpenseId={setEditingExpenseId}
            editExpenseData={editExpenseData}
            setEditExpenseData={setEditExpenseData}
            handleEditExpense={handleEditExpense}
            handleSaveExpense={handleSaveExpense}
            handleDeleteExpense={handleDeleteExpense}
            showAddExpenseModal={showAddExpenseModal}
            setShowAddExpenseModal={setShowAddExpenseModal}
            newExpense={newExpense}
            handleAddExpense={handleAddExpense}
            generatePDF={generatePDF}
            onSaveNote={handleSaveNote}
            API_BASE_URL={API_BASE_URL}
          />
        )}

        {currentPage === "candidateDetails" && selectedCandidate && (
          <CandidateDetails
            appStyles={appStyles}
            selectedCandidate={selectedCandidate}
            selectedService={selectedService}
            canUpdate={selectedService ? canUpdateService(selectedService.id) : false}
            setCurrentPage={setCurrentPage}
            setSelectedCandidate={setSelectedCandidate}
            setShowEditCandidateModal={setShowEditCandidateModal}
            setEditCandidate={setEditCandidate}
            handleEditCandidate={handleEditCandidate}
            showEditCandidateModal={showEditCandidateModal}
            editCandidate={editCandidate}
            editingRevenueId={editingRevenueId}
            setEditingRevenueId={setEditingRevenueId}
            editRevenueData={editRevenueData}
            setEditRevenueData={setEditRevenueData}
            handleEditRevenue={handleEditRevenue}
            handleSaveRevenue={handleSaveRevenue}
            handleDeleteRevenue={handleDeleteRevenue}
            showAddRevenueModal={showAddRevenueModal}
            setShowAddRevenueModal={setShowAddRevenueModal}
            newRevenue={newRevenue}
            handleAddRevenue={handleAddRevenue}
            editingExpenseId={editingExpenseId}
            setEditingExpenseId={setEditingExpenseId}
            editExpenseData={editExpenseData}
            setEditExpenseData={setEditExpenseData}
            handleEditExpense={handleEditExpense}
            handleSaveExpense={handleSaveExpense}
            handleDeleteExpense={handleDeleteExpense}
            showAddExpenseModal={showAddExpenseModal}
            setShowAddExpenseModal={setShowAddExpenseModal}
            newExpense={newExpense}
            handleAddExpense={handleAddExpense}
            generatePDF={generatePDF}
            onSaveNote={handleSaveNote}
            API_BASE_URL={API_BASE_URL}
          />
        )}
      </Container>
    </div>
  );
}

export default App;
