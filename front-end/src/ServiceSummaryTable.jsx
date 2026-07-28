
   import React from "react";
   import { Table } from "react-bootstrap";

   const ServiceSummaryTable = ({ revenues, expenses, appStyles }) => {
     // Grouper les données par service
     const services = [...new Set([...revenues.map(r => r.service), ...expenses.map(e => e.service)])];

     const summary = services.map(service => {
       const serviceRevenues = revenues.filter(r => r.service === service);
       const serviceExpenses = expenses.filter(e => e.service === service);

       const incomeHT = serviceRevenues.reduce((sum, r) => sum + Number(r.amountHT || 0), 0);
       const incomeTTC = serviceRevenues.reduce((sum, r) => sum + Number(r.amountTTC || 0), 0);
       const outcomeHT = serviceExpenses.reduce((sum, e) => sum + Number(e.amountHT || 0), 0);
       const outcomeTTC = serviceExpenses.reduce((sum, e) => sum + Number(e.amountTTC || 0), 0);
       const resultHT = incomeHT - outcomeHT;
       const tvaCollected = serviceRevenues.reduce((sum, r) => sum + (Number(r.amountHT || 0) * (Number(r.tva || 0) / 100)), 0);
       const tvaDeductible = serviceExpenses.reduce((sum, e) => sum + (Number(e.amountHT || 0) * (Number(e.tva || 0) / 100)), 0);
       const tvaNet = tvaCollected - tvaDeductible;

       return {
         service,
         incomeHT,
         incomeTTC,
         outcomeHT,
         outcomeTTC,
         resultHT,
         tvaCollected,
         tvaDeductible,
         tvaNet,
       };
     });

     return (
       <Table striped bordered hover style={appStyles.table}>
         <thead>
           <tr>
             <th>Service</th>
             <th>Income HT (DT)</th>
             <th>Income TTC (DT)</th>
             <th>Outcome HT (DT)</th>
             <th>Outcome TTC (DT)</th>
             <th>Résultat HT (DT)</th>
             <th>TVA collectée (DT)</th>
             <th>TVA déductible (DT)</th>
             <th>TVA nette (DT)</th>
           </tr>
         </thead>
         <tbody>
           {summary.map((row, index) => (
             <tr key={index}>
               <td>{row.service}</td>
               <td>{row.incomeHT}</td>
               <td>{row.incomeTTC}</td>
               <td>{row.outcomeHT}</td>
               <td>{row.outcomeTTC}</td>
               <td>{row.resultHT}</td>
               <td>{row.tvaCollected}</td>
               <td>{row.tvaDeductible}</td>
               <td>{row.tvaNet}</td>
             </tr>
           ))}
         </tbody>
       </Table>
     );
   };

   export default ServiceSummaryTable;