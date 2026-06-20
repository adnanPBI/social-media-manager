import { Download } from 'lucide-react';
import { api } from '../lib/api';

export function ReportsPage() {
  async function downloadReport(type: 'csv' | 'pdf') {
    const response = await api.get(`/reports/export.${type}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report.${type}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <section className="card reports-card">
      <h2>Download reports</h2>
      <p>
        CSV and PDF exports use the same analytics snapshot data as the dashboard, so exported values match the on-screen metrics.
      </p>
      <div className="report-actions">
        <button className="primary link-button" onClick={() => downloadReport('csv')}>
          <Download size={18} /> Download CSV
        </button>
        <button className="primary link-button" onClick={() => downloadReport('pdf')}>
          <Download size={18} /> Download PDF
        </button>
      </div>
      <div className="notice">
        PDF generation uses Playwright in the API container. If deploying on restricted cPanel hosting, keep PDF export on the API/VPS side.
      </div>
    </section>
  );
}
