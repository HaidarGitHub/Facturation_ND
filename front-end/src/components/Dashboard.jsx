import React, { useState } from "react";
import { Container, Row, Col, Card, Table, Button, Modal, Form } from "react-bootstrap";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import ExpenseForm from "./ExpenseForm";

// Distinct, high-contrast palette so no two adjacent slices look alike,
// even if the number of services grows past the palette length (it repeats).
const CHART_COLORS = [
  "#2563eb", // blue
  "#dc2626", // red
  "#059669", // green
  "#d97706", // amber
  "#7c3aed", // purple
  "#db2777", // pink
  "#0891b2", // cyan
  "#65a30d", // lime
  "#ea580c", // orange
  "#4f46e5", // indigo
];

const Dashboard = ({
  dashboardStats,
  generalExpenses = [],
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  onAddGeneralExpense,
  onEditGeneralExpense,
  onDeleteGeneralExpense,
}) => {
  const [showGeneralExpenseModal, setShowGeneralExpenseModal] = useState(false);
  const [editingGeneralExpense, setEditingGeneralExpense] = useState(null);

  const monthOptions = [
    { value: "1", label: "Janvier" },
    { value: "2", label: "Février" },
    { value: "3", label: "Mars" },
    { value: "4", label: "Avril" },
    { value: "5", label: "Mai" },
    { value: "6", label: "Juin" },
    { value: "7", label: "Juillet" },
    { value: "8", label: "Août" },
    { value: "9", label: "Septembre" },
    { value: "10", label: "Octobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Décembre" },
  ];

  const yearOptions = Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - 5 + index);

  const defaultGeneralExpense = {
    description: "",
    amount: "",
    amountHT: "",
    amountTTC: "",
    tva: "",
    date: new Date().toISOString().split("T")[0],
  };

  const openNewGeneralExpenseModal = () => {
    setEditingGeneralExpense(null);
    setShowGeneralExpenseModal(true);
  };

  const openEditGeneralExpenseModal = (expense) => {
    setEditingGeneralExpense(expense);
    setShowGeneralExpenseModal(true);
  };

  const handleGeneralExpenseSave = (formData) => {
    if (editingGeneralExpense?.id) {
      onEditGeneralExpense?.(editingGeneralExpense.id, formData);
    } else {
      onAddGeneralExpense?.(formData);
    }
    setShowGeneralExpenseModal(false);
    setEditingGeneralExpense(null);
  };

  const filteredGeneralExpenses = (generalExpenses || []).filter((item) => {
    if (!item?.date) return false;

    const dateValue = item.date.includes('T') ? item.date : `${item.date}T00:00:00`;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return false;

    if (selectedYear && String(date.getFullYear()) !== String(selectedYear)) {
      return false;
    }

    if (selectedMonth && String(date.getMonth() + 1).padStart(2, '0') !== String(selectedMonth).padStart(2, '0')) {
      return false;
    }

    return true;
  });

  const totalGeneralExpensesTTC = filteredGeneralExpenses.reduce((sum, item) => {
    const amountTTC = Number(item.amountTTC ?? item.amount ?? 0);
    return sum + amountTTC;
  }, 0);

  const totalGeneralExpensesHT = filteredGeneralExpenses.reduce((sum, item) => {
    const amountHT = Number(item.amountHT ?? item.amount ?? 0);
    return sum + amountHT;
  }, 0);

  return (
    <>
      <style>
        {`
          /* General page styling */
          .container-fluid {
            padding: 2rem;
            background-color: #f8fafc;
            min-height: 100vh;
          }

          /* Heading styles */
          .dashboard-heading {
            font-size: 2.5rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 2rem;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.05rem;
          }

          .section-heading {
            font-size: 1.75rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 1.5rem;
            text-align: left;
            border-left: 4px solid #1e293b;
            padding-left: 1rem;
          }

          /* Card styles */
          .dashboard-card {
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s;
          }

          .dashboard-card:hover {
            transform: translateY(-5px);
          }

          .dashboard-card .card-body {
            padding: 1.5rem;
          }

          .dashboard-card .card-title {
            font-size: 1.25rem;
            color: #475569;
            margin-bottom: 1rem;
            font-weight: 600;
          }

          .dashboard-card .display-6 {
            font-size: 2rem;
            font-weight: 600;
            color: #1e293b;
          }

          /* Table styles */
          .dashboard-table {
            background-color: #ffffff;
            border-radius: 0.5rem;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }

          .dashboard-table thead {
            background-color: #1e293b;
            color: #ffffff;
          }

          .dashboard-table th {
            font-weight: 600;
            padding: 1rem;
            text-align: center;
            vertical-align: middle;
          }

          .dashboard-table td {
            padding: 1rem;
            vertical-align: middle;
          }

          /* Specific styling for revenue and expense columns */
          .dashboard-table td:nth-child(3),
          .dashboard-table td:nth-child(4),
          .dashboard-table td:nth-child(5) {
            background-color: #ecfdf5;
            color: #065f46;
            font-weight: 500;
          }

          .dashboard-table td:nth-child(6),
          .dashboard-table td:nth-child(7),
          .dashboard-table td:nth-child(8) {
            background-color: #fef2f2;
            color: #991b1b;
            font-weight: 500;
          }

          .dashboard-table td:nth-child(9) {
            font-weight: 600;
            color: #1e293b;
            background-color: #f0f4f8;
          }

          /* Highlight positive/negative balance */
          .dashboard-table td.positive-balance {
            color: #065f46;
          }

          .dashboard-table td.negative-balance {
            color: #991b1b;
          }

          /* Responsive adjustments */
          @media (max-width: 768px) {
            .dashboard-table {
              font-size: 0.9rem;
            }

            .dashboard-table th,
            .dashboard-table td {
              padding: 0.75rem;
            }

            .dashboard-heading {
              font-size: 2rem;
            }

            .section-heading {
              font-size: 1.5rem;
            }
          }
        `}
      </style>

      {/* Dashboard Content */}
      <Container fluid>
        <h2 className="dashboard-heading">Tableau de Bord</h2>
        <div className="d-flex flex-wrap align-items-end gap-3 mb-4">
          <Form.Group style={{ minWidth: 140 }}>
            <Form.Label className="small text-muted mb-1">Année</Form.Label>
            <Form.Select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                if (e.target.value !== selectedYear) setSelectedMonth("");
              }}
            >
              <option value="">Toutes</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group style={{ minWidth: 160 }}>
            <Form.Label className="small text-muted mb-1">Mois</Form.Label>
            <Form.Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={!selectedYear}
            >
              <option value="">Tous</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => {
              setSelectedYear("");
              setSelectedMonth("");
            }}
          >
            Réinitialiser
          </Button>
        </div>
        <Row xs={1} md={2} lg={5} className="g-4 mb-4">
          <Col>
            <Card className="dashboard-card">
              <Card.Body>
                <Card.Title>Total Candidats</Card.Title>
                <Card.Text className="display-6">{dashboardStats.totalCandidates}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col>
            <Card className="dashboard-card">
              <Card.Body>
                <Card.Title>Total Services</Card.Title>
                <Card.Text  className="display-6">{dashboardStats.totalServices}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col>
            <Card className="dashboard-card">
              <Card.Body>
                <Card.Title>Total Revenus (TTC)</Card.Title>
                <Card.Text className="display-6">{(parseFloat(dashboardStats.totalRevenue) || 0).toFixed(2)} DT</Card.Text>
                <hr style={{ margin: '0.5rem 0' }} />
                <Card.Title style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Revenus HT</Card.Title>
                <Card.Text className="display-6" style={{ fontSize: '1.5rem' }}>{(parseFloat(dashboardStats.totalRevenueHT) || 0).toFixed(2)} DT</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col>
            <Card className="dashboard-card">
              <Card.Body>
                <Card.Title>Total Dépenses (TTC)</Card.Title>
                <Card.Text className="display-6">{(parseFloat(dashboardStats.totalExpenses) || 0).toFixed(2)} DT</Card.Text>
                <hr style={{ margin: '0.5rem 0' }} />
                <Card.Title style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Dépenses HT</Card.Title>
                <Card.Text className="display-6" style={{ fontSize: '1.5rem' }}>{(parseFloat(dashboardStats.totalExpensesHT) || 0).toFixed(2)} DT</Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col>
            <Card className="dashboard-card">
              <Card.Body>
                <Card.Title>Solde Total (TTC)</Card.Title>
                <Card.Text 
                  className="display-6" 
                  style={{ 
                    color: (parseFloat(dashboardStats.totalRevenue) || 0) - (parseFloat(dashboardStats.totalExpenses) || 0) >= 0 ? '#065f46' : '#991b1b' 
                  }}
                >
                  {((parseFloat(dashboardStats.totalRevenue) || 0) - (parseFloat(dashboardStats.totalExpenses) || 0)).toFixed(2)} DT
                </Card.Text>
                <hr style={{ margin: '0.5rem 0' }} />
                <Card.Title style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Solde Total HT</Card.Title>
                <Card.Text 
                  className="display-6"
                  style={{ 
                    fontSize: '1.5rem',
                    color: (parseFloat(dashboardStats.totalRevenueHT) || 0) - (parseFloat(dashboardStats.totalExpensesHT) || 0) >= 0 ? '#065f46' : '#991b1b' 
                  }}
                >
                  {((parseFloat(dashboardStats.totalRevenueHT) || 0) - (parseFloat(dashboardStats.totalExpensesHT) || 0)).toFixed(2)} DT
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="section-heading mb-0">Dépenses générales hors services</h3>
          <Button variant="primary" onClick={openNewGeneralExpenseModal}>+ Ajouter</Button>
        </div>
        <Table striped bordered hover className="dashboard-table mb-5">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Montant HT</th>
              <th>TVA</th>
              <th>Montant TTC</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGeneralExpenses.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center">Aucune dépense générale enregistrée pour cette période.</td>
              </tr>
            ) : (
              filteredGeneralExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.date}</td>
                  <td>{expense.description}</td>
                  <td>{Number(expense.amountHT || 0).toFixed(2)} DT</td>
                  <td>{expense.tva ?? "-"}%</td>
                  <td>{Number(expense.amountTTC || expense.amount || 0).toFixed(2)} DT</td>
                  <td>
                    <div className="d-flex gap-2">
                      <Button variant="outline-secondary" size="sm" onClick={() => openEditGeneralExpenseModal(expense)}>
                        Modifier
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => onDeleteGeneralExpense?.(expense.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
        <div className="mb-4">
          <Card className="dashboard-card">
            <Card.Body>
              <Card.Title>Total Dépenses Générales (TTC)</Card.Title>
              <Card.Text className="display-6">{(totalGeneralExpensesTTC || 0).toFixed(2)} DT</Card.Text>
              <hr style={{ margin: '0.5rem 0' }} />
              <Card.Title style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Dépenses Générales HT</Card.Title>
              <Card.Text className="display-6" style={{ fontSize: '1.5rem' }}>{(totalGeneralExpensesHT || 0).toFixed(2)} DT</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <h3 className="section-heading">Répartition par Service</h3>
        <Table striped bordered hover className="dashboard-table">
          <thead>
            <tr>
              <th rowSpan="2">Service</th>
              <th rowSpan="2">Nombre de Candidats</th>
              <th colSpan="2">Revenus (DT)</th>
              <th colSpan="2">Dépenses (DT)</th>
              <th rowSpan="2">Solde TTC (DT)</th>
            </tr>
            <tr>
              <th>HT</th>
              <th>TTC</th>
              <th>HT</th>
              <th>TTC</th>
            </tr>
          </thead>
          <tbody>
            {dashboardStats.serviceStats.map((stat, index) => {
              const revenueHT = parseFloat(stat.revenueHT) || 0;
              const revenueTTC = parseFloat(stat.revenueTTC) || 0;
              const expensesHT = parseFloat(stat.expensesHT) || 0;
              const expensesTTC = parseFloat(stat.expensesTTC) || 0;
              const balance = revenueTTC - expensesTTC;
              return (
                <tr key={index}>
                  <td>{stat.serviceName}</td>
                  <td>{stat.candidateCount}</td>
                  <td>{revenueHT.toFixed(2)}</td>
                  <td>{revenueTTC.toFixed(2)}</td>
                  <td>{expensesHT.toFixed(2)}</td>
                  <td>{expensesTTC.toFixed(2)}</td>
                  <td className={balance >= 0 ? "positive-balance" : "negative-balance"}>
                    {balance.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>

        {/* Charts Section */}
        <h3 className="section-heading mt-5">Graphiques et Analyses</h3>
        <Row className="g-4 mb-4">
          {/* Pie Chart - Revenue vs Expenses */}
          <Col lg={6}>
            <Card className="dashboard-card">
              <Card.Body>
                <Card.Title>Répartition Revenus vs Dépenses</Card.Title>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Revenus', value: parseFloat(dashboardStats.totalRevenue) || 0 },
                        { name: 'Dépenses', value: parseFloat(dashboardStats.totalExpenses) || 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#065f46" />
                      <Cell fill="#dc2626" />
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(2)} DT`} />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>

          {/* Service Breakdown Pie Chart - Revenues */}
          <Col lg={6}>
            <Card className="dashboard-card">
              <Card.Body>
                <Card.Title>Distribution des Revenus par Service (%)</Card.Title>
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <Pie
                      data={dashboardStats.serviceStats.map(stat => ({
                        name: stat.serviceName,
                        value: parseFloat(stat.revenueTTC) || 0
                      }))}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dashboardStats.serviceStats.map((_, index) => (
                        <Cell key={`revenue-cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value.toFixed(2)} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '0.85rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Service Breakdown Pie Chart - Expenses */}
        <Row className="g-4 mb-4">
          <Col lg={6}>
            <Card className="dashboard-card">
              <Card.Body>
                <Card.Title>Distribution des Dépenses par Service (%)</Card.Title>
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <Pie
                      data={dashboardStats.serviceStats.map(stat => ({
                        name: stat.serviceName,
                        value: parseFloat(stat.expensesTTC) || 0
                      }))}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dashboardStats.serviceStats.map((_, index) => (
                        <Cell key={`expense-cell-${index}`} fill={CHART_COLORS[(index + 1) % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(2)} DT`} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '0.85rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <Modal show={showGeneralExpenseModal} onHide={() => setShowGeneralExpenseModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingGeneralExpense ? "Modifier la dépense générale" : "Ajouter une dépense générale"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ExpenseForm
            key={editingGeneralExpense?.id || "new-general-expense"}
            expense={editingGeneralExpense || defaultGeneralExpense}
            onSave={handleGeneralExpenseSave}
            onCancel={() => setShowGeneralExpenseModal(false)}
          />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default Dashboard;