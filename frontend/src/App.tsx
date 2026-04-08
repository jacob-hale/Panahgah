import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute } from './components/admin/AdminRoute';
import { AppLayout } from './components/AppLayout';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CaseloadInventoryPage } from './pages/CaseloadInventoryPage';
import { CaseloadResidentFormPage } from './pages/CaseloadResidentFormPage';
import { HomePage } from './pages/HomePage';
import { ImpactDashboardPage } from './pages/ImpactDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountPage } from './pages/AccountPage';
import { DonatePage } from './pages/DonatePage';
import { AdminSupportersPage } from './pages/AdminSupportersPage';
import { AdminSupporterDetailPage } from './pages/AdminSupporterDetailPage';
import { DonorLapseInsightsPage } from './pages/DonorLapseInsightsPage';
import { DonorUpgradeInsightsPage } from './pages/DonorUpgradeInsightsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { ProcessRecordingPage } from './pages/ProcessRecordingPage';
import { SocialPostStudioPage } from './pages/SocialPostStudioPage';
import { SocialMediaInsightsPage } from './pages/SocialMediaInsightsPage';
import { VisitsAndConferencesPage } from './pages/VisitsAndConferencesPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="donate" element={<DonatePage />} />
        <Route path="impact-dashboard" element={<ImpactDashboardPage />} />
        <Route path="privacy" element={<PrivacyPolicyPage />} />
        <Route path="admin" element={<AdminRoute />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="caseload/new" element={<CaseloadResidentFormPage />} />
          <Route path="caseload/:residentId/edit" element={<CaseloadResidentFormPage />} />
          <Route path="caseload" element={<CaseloadInventoryPage />} />
          <Route path="process-recordings" element={<ProcessRecordingPage />} />
          <Route path="visits-and-conferences" element={<VisitsAndConferencesPage />} />
          <Route path="social-insights" element={<SocialMediaInsightsPage />} />
          <Route path="donor-lapse-insights" element={<DonorLapseInsightsPage />} />
          <Route path="donor-upgrade-insights" element={<DonorUpgradeInsightsPage />} />
          <Route path="social-post-studio" element={<SocialPostStudioPage />} />
          <Route path="supporters" element={<AdminSupportersPage />} />
          <Route path="supporters/:supporterId" element={<AdminSupporterDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
