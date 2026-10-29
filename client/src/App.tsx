import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { AppLayout } from './components/layout/AppLayout';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { BacklogPage } from './pages/BacklogPage';
import { SprintPlanningPage } from './pages/SprintPlanningPage';
import { KanbanBoardPage } from './pages/KanbanBoardPage';
import { ListViewPage } from './pages/ListViewPage';
import { EpicsPage } from './pages/EpicsPage';
import { TeamRolesPage } from './pages/TeamRolesPage';
import { SettingsPage } from './pages/SettingsPage';
import { TimeTrackingPage } from './pages/TimeTrackingPage';
import { FinancePage } from './pages/FinancePage';
import { QAManagerPage } from './pages/QAManagerPage';
import { RiskRegisterPage } from './pages/RiskRegisterPage';
import { ReleasesPage } from './pages/ReleasesPage';
import { ReportsPage } from './pages/ReportsPage';
import { OKRsPage } from './pages/OKRsPage';
import { AutomationPage } from './pages/AutomationPage';
import { CSVImportExportPage } from './pages/CSVImportExportPage';
import { RetrospectivesPage } from './pages/RetrospectivesPage';
import { DiscussionsPage } from './pages/DiscussionsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Application shell */}
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="backlog" element={<BacklogPage />} />
              <Route path="sprints" element={<SprintPlanningPage />} />
              <Route path="board" element={<KanbanBoardPage />} />
              <Route path="list" element={<ListViewPage />} />
              <Route path="epics" element={<EpicsPage />} />
              <Route path="retrospectives" element={<RetrospectivesPage />} />
              <Route path="team" element={<TeamRolesPage />} />
              <Route path="discussions" element={<DiscussionsPage />} />
              <Route path="time-tracking" element={<TimeTrackingPage />} />
              <Route path="finance" element={<FinancePage />} />
              <Route path="qa" element={<QAManagerPage />} />
              <Route path="risks" element={<RiskRegisterPage />} />
              <Route path="releases" element={<ReleasesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="okrs" element={<OKRsPage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="automation" element={<AutomationPage />} />
              <Route path="csv" element={<CSVImportExportPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
