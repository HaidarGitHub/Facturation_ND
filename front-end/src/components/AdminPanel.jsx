import React, { useEffect, useState } from 'react';
import { Container, Table, Button, Modal, Form, Badge, Alert } from 'react-bootstrap';
import api from '../utils/api';
import { API_BASE_URL } from '../config';
import { getUsername } from '../utils/auth';

const emptyPermissions = (services) => {
  const perms = {};
  services.forEach((s) => {
    perms[String(s.id)] = { view: false, update: false };
  });
  return perms;
};

const AdminPanel = ({ appStyles, services }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user',
    permissions: {},
  });
  const [editPermissions, setEditPermissions] = useState({});
  const [editRole, setEditRole] = useState('user');
  const [newPassword, setNewPassword] = useState('');

  const currentUsername = getUsername();

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`${API_BASE_URL}/admin/users`);
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setNewUser({
      username: '',
      password: '',
      role: 'user',
      permissions: emptyPermissions(services),
    });
    setShowCreateModal(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditRole(user.role);
    const perms = emptyPermissions(services);
    Object.entries(user.permissions || {}).forEach(([id, p]) => {
      perms[id] = { view: !!p.view, update: !!p.update };
    });
    setEditPermissions(perms);
    setShowEditModal(true);
  };

  const openResetModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowResetModal(true);
  };

  const togglePermission = (perms, setPerms, serviceId, field) => {
    const id = String(serviceId);
    const current = perms[id] || { view: false, update: false };
    const updated = { ...current, [field]: !current[field] };
    if (field === 'view' && !updated.view) {
      updated.update = false;
    }
    if (field === 'update' && updated.update) {
      updated.view = true;
    }
    setPerms({ ...perms, [id]: updated });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post(`${API_BASE_URL}/admin/users`, {
        username: newUser.username,
        password: newUser.password,
        role: newUser.role,
        permissions: newUser.role === 'admin' ? {} : newUser.permissions,
      });
      setSuccess('Utilisateur créé avec succès.');
      setShowCreateModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création.');
    }
  };

  const handleUpdatePermissions = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.put(`${API_BASE_URL}/admin/users/${selectedUser.id}/permissions`, {
        role: editRole,
        permissions: editRole === 'admin' ? {} : editPermissions,
      });
      setSuccess('Permissions mises à jour.');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post(`${API_BASE_URL}/admin/users/${selectedUser.id}/reset-password`, {
        new_password: newPassword,
      });
      setSuccess('Mot de passe réinitialisé.');
      setShowResetModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation.');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Supprimer l'utilisateur "${user.username}" ?`)) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`${API_BASE_URL}/admin/users/${user.id}`);
      setSuccess('Utilisateur supprimé.');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  const renderPermissionMatrix = (perms, setPerms, disabled) => (
    <Table bordered size="sm" style={{ marginTop: 12 }}>
      <thead>
        <tr>
          <th>Service</th>
          <th className="text-center">Voir</th>
          <th className="text-center">Modifier</th>
        </tr>
      </thead>
      <tbody>
        {services.map((service) => {
          const p = perms[String(service.id)] || { view: false, update: false };
          return (
            <tr key={service.id}>
              <td>{service.name}</td>
              <td className="text-center">
                <Form.Check
                  type="checkbox"
                  checked={p.view}
                  disabled={disabled}
                  onChange={() => togglePermission(perms, setPerms, service.id, 'view')}
                />
              </td>
              <td className="text-center">
                <Form.Check
                  type="checkbox"
                  checked={p.update}
                  disabled={disabled || !p.view}
                  onChange={() => togglePermission(perms, setPerms, service.id, 'update')}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );

  return (
    <Container fluid style={appStyles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={appStyles.heading}>Gestion des utilisateurs</h2>
        <Button variant="primary" onClick={openCreateModal}>
          + Créer un utilisateur
        </Button>
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <Table striped bordered hover style={appStyles.table}>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Rôle</th>
              <th>Accès services</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>
                  <Badge bg={user.role === 'admin' ? 'danger' : 'secondary'}>
                    {user.role === 'admin' ? 'Admin' : 'Utilisateur'}
                  </Badge>
                </td>
                <td>
                  {user.role === 'admin' ? (
                    <span className="text-muted">Accès complet</span>
                  ) : (
                    Object.entries(user.permissions || {})
                      .filter(([, p]) => p.view)
                      .map(([id, p]) => {
                        const service = services.find((s) => s.id === parseInt(id));
                        return (
                          <Badge key={id} bg={p.update ? 'success' : 'info'} className="me-1 mb-1">
                            {service?.name || `Service ${id}`} ({p.update ? 'modifier' : 'voir'})
                          </Badge>
                        );
                      })
                  )}
                </td>
                <td style={{ ...appStyles.actionButtons, whiteSpace: 'nowrap' }}>
                  <Button variant="warning" size="sm" style={appStyles.button} onClick={() => openEditModal(user)}>
                    Permissions
                  </Button>
                  <Button variant="secondary" size="sm" style={appStyles.button} onClick={() => openResetModal(user)}>
                    Réinitialiser MDP
                  </Button>
                  {user.username !== currentUsername && (
                    <Button variant="danger" size="sm" onClick={() => handleDeleteUser(user)}>
                      Supprimer
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Créer un utilisateur</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateUser}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nom d'utilisateur</Form.Label>
              <Form.Control
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mot de passe</Form.Label>
              <Form.Control
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Rôle</Form.Label>
              <Form.Select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="user">Utilisateur</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
            {newUser.role === 'user' &&
              renderPermissionMatrix(newUser.permissions, (p) => setNewUser({ ...newUser, permissions: p }), false)}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Annuler</Button>
            <Button variant="primary" type="submit">Créer</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Permissions — {selectedUser?.username}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdatePermissions}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Rôle</Form.Label>
              <Form.Select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                <option value="user">Utilisateur</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
            {editRole === 'user' &&
              renderPermissionMatrix(editPermissions, setEditPermissions, false)}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Annuler</Button>
            <Button variant="primary" type="submit">Enregistrer</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showResetModal} onHide={() => setShowResetModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Réinitialiser le mot de passe — {selectedUser?.username}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleResetPassword}>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Nouveau mot de passe</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowResetModal(false)}>Annuler</Button>
            <Button variant="primary" type="submit">Réinitialiser</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default AdminPanel;
