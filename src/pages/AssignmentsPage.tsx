// ---------------------------------------------------------------------------
// Assignments Page — Host view of all their assignments
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getHostAssignments, closeAssignment, deleteAssignment } from '../services/assignments';
import Button from '../components/ui/Button';
import './AssignmentReport.css'; // reuse table/section styles

const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [working, setWorking] = useState<string | null>(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', user?.uid],
    queryFn: () => getHostAssignments(user!.uid),
    enabled: !!user,
  });

  async function handleClose(id: string) {
    if (!window.confirm('Close this assignment? Students will no longer be able to submit.')) return;
    setWorking(id);
    await closeAssignment(id);
    queryClient.invalidateQueries({ queryKey: ['assignments', user?.uid] });
    setWorking(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this assignment? This cannot be undone.')) return;
    setWorking(id);
    await deleteAssignment(id);
    queryClient.invalidateQueries({ queryKey: ['assignments', user?.uid] });
    setWorking(null);
  }

  if (isLoading) {
    return (
      <div className="ar-page">
        <div className="ar-loading">
          <div className="loading-spinner" />
          <p>Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ar-page">
      <div className="container ar-container">
        <div className="ar-header">
          <h1 className="ar-title">Assignments</h1>
          <Link to="/dashboard"><Button variant="ghost" size="md">Back to Dashboard</Button></Link>
        </div>

        {assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)' }}>
            <p>No assignments yet. Click "Assign" on any quiz card to create one.</p>
            <Link to="/dashboard"><Button variant="primary" size="md" style={{ marginTop: '1rem' }}>Go to Dashboard</Button></Link>
          </div>
        ) : (
          <div className="ar-table-wrap">
            <table className="ar-table">
              <thead>
                <tr>
                  <th>Quiz</th>
                  <th>Code</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const isOpen = !a.closed && Date.now() <= a.deadline;
                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.quizTitle}</div>
                        {a.label && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{a.label}</div>}
                      </td>
                      <td><strong>{a.code}</strong></td>
                      <td className="ar-date">{new Date(a.deadline).toLocaleDateString()} {new Date(a.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <span className={`ar-status-badge ${isOpen ? 'open' : 'closed'}`}>{isOpen ? 'Open' : 'Closed'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <Link to={`/assignment-report/${a.id}`}>
                            <Button variant="secondary" size="sm">Results</Button>
                          </Link>
                          {isOpen && (
                            <Button variant="ghost" size="sm" isLoading={working === a.id} onClick={() => handleClose(a.id)}>
                              Close
                            </Button>
                          )}
                          <Button variant="danger" size="sm" isLoading={working === a.id} onClick={() => handleDelete(a.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentsPage;
