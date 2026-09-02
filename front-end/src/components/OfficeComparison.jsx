import React from 'react';
import { Container, Row, Col, Card, Table } from 'react-bootstrap';

const money = (value) => `${Number(value || 0).toFixed(2)} DT`;

const OfficeComparison = ({ stats }) => {
  const offices = [
    { key: 'tunis', label: 'Tunis', data: stats.tunis || {} },
    { key: 'kebili', label: 'Kébili', data: stats.kebili || {} },
  ];
  const value = (office, field) => Number(office.data[field] || 0);

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Comparaison des bureaux</h2>
      <Row className="g-4 mb-4">
        {offices.map((office) => {
          const balance = value(office, 'totalRevenue') - value(office, 'totalExpenses');
          return (
            <Col md={6} key={office.key}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <Card.Title>Bureau de {office.label}</Card.Title>
                  <p><strong>Candidats :</strong> {value(office, 'totalCandidates')}</p>
                  <p><strong>Revenus TTC :</strong> {money(value(office, 'totalRevenue'))}</p>
                  <p><strong>Dépenses TTC :</strong> {money(value(office, 'totalExpenses'))}</p>
                  <p className={balance >= 0 ? 'text-success' : 'text-danger'}>
                    <strong>Solde TTC :</strong> {money(balance)}
                  </p>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
      <Table striped bordered responsive>
        <thead>
          <tr><th>Indicateur</th><th>Tunis</th><th>Kébili</th><th>Différence</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Candidats</td>
            <td>{value(offices[0], 'totalCandidates')}</td>
            <td>{value(offices[1], 'totalCandidates')}</td>
            <td>{value(offices[0], 'totalCandidates') - value(offices[1], 'totalCandidates')}</td>
          </tr>
          {[
            ['Revenus HT', 'totalRevenueHT'], ['Revenus TTC', 'totalRevenue'],
            ['Dépenses HT', 'totalExpensesHT'], ['Dépenses TTC', 'totalExpenses'],
          ].map(([label, field]) => (
            <tr key={field}>
              <td>{label}</td>
              <td>{money(value(offices[0], field))}</td>
              <td>{money(value(offices[1], field))}</td>
              <td>{money(value(offices[0], field) - value(offices[1], field))}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default OfficeComparison;
