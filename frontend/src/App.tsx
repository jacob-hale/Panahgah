import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute } from './components/admin/AdminRoute';
import { AppLayout } from './components/AppLayout';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CaseloadInventoryPage } from './pages/CaseloadInventoryPage';
import { HomePage } from './pages/HomePage';
import { ImpactDashboardPage } from './pages/ImpactDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { DonorLapseInsightsPage } from './pages/DonorLapseInsightsPage';
import { DonorUpgradeInsightsPage } from './pages/DonorUpgradeInsightsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { ProcessRecordingPage } from './pages/ProcessRecordingPage';
import { SocialMediaInsightsPage } from './pages/SocialMediaInsightsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="impact-dashboard" element={<ImpactDashboardPage />} />
        <Route path="privacy" element={<PrivacyPolicyPage />} />
        <Route path="admin" element={<AdminRoute />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="caseload" element={<CaseloadInventoryPage />} />
          <Route path="process-recordings" element={<ProcessRecordingPage />} />
          <Route path="social-insights" element={<SocialMediaInsightsPage />} />
          <Route path="donor-lapse-insights" element={<DonorLapseInsightsPage />} />
          <Route path="donor-upgrade-insights" element={<DonorUpgradeInsightsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
