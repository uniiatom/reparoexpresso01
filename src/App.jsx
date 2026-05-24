import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import RequireAuth from '@/components/auth/RequireAuth';
import RoleRoute from '@/components/auth/RoleRoute';
import { ROLES } from '@/lib/auth/roles';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import SolicitarServico from './pages/SolicitarServico';
import AcompanharServico from './pages/AcompanharServico';
import ProviderApp from './pages/ProviderApp';
import AdminPanel from './pages/AdminPanel';
import ClientRegister from './pages/ClientRegister';
import ProviderRegister from './pages/ProviderRegister';
import ProviderCNPJRegistration from './pages/ProviderCNPJRegistration';
import TermosCliente from './pages/TermosCliente';
import TermosPrestador from './pages/TermosPrestador';
import UserProfile from './pages/UserProfile';
import ProviderProfile from './pages/ProviderProfile';
import ProviderEarnings from './pages/ProviderEarnings';
import ProviderSchedule from './pages/ProviderSchedule';
import LoyaltyRewards from './pages/LoyaltyRewards';
import ProviderLocationMap from './pages/ProviderLocationMap';
import TrackingMap from './pages/TrackingMap';
import MeusPedidos from './pages/MeusPedidos';
import PartnerRegister from './pages/PartnerRegister';
import ProviderDashboard from './pages/ProviderDashboard';
import ClientWarranty from './pages/ClientWarranty';
import WalletPage from './pages/Wallet';
import DashboardAdmin from './pages/DashboardAdmin';
import ProviderAwards from './pages/ProviderAwards';
import ClienteDossie from './pages/ClienteDossie';
import MeusServicos from './pages/MeusServicos';
import ProviderMetricsPanel from './pages/ProviderMetricsPanel';
import Jornada from './pages/Jornada';
import ProviderAgenda from './pages/ProviderAgenda';
import { Toaster as SonnerToaster } from "sonner";
import SupabaseConfigGuard from '@/components/config/SupabaseConfigGuard';

function AuthedShell() {
  return (
    <RequireAuth>
      <AppLayout />
    </RequireAuth>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route path="/cadastro" element={<ClientRegister />} />
      <Route path="/cadastro-prestador" element={<ProviderRegister />} />
      <Route path="/cadastro-cnpj" element={<ProviderCNPJRegistration />} />
      <Route path="/cadastro-parceiro" element={<PartnerRegister />} />
      <Route path="/termos-cliente" element={<TermosCliente />} />
      <Route path="/termos-prestador" element={<TermosPrestador />} />

      <Route element={<AuthedShell />}>
        <Route path="/inicio" element={<Home />} />
        <Route path="/solicitar" element={<SolicitarServico />} />
        <Route path="/acompanhar/:id" element={<AcompanharServico />} />
        <Route path="/meus-pedidos" element={<MeusPedidos />} />
        <Route path="/garantia" element={<ClientWarranty />} />
        <Route path="/perfil" element={<UserProfile />} />
        <Route path="/prestador" element={<ProviderApp />} />
        <Route path="/prestador/cadastro" element={<ProviderRegister />} />
        <Route path="/prestador/:id" element={<ProviderProfile />} />
        <Route path="/recompensas" element={<LoyaltyRewards />} />
        <Route path="/carteira" element={<WalletPage />} />
        <Route path="/minha-ficha" element={<ClienteDossie />} />
        <Route path="/meus-servicos" element={<MeusServicos />} />
        <Route path="/jornada" element={<Jornada />} />

        <Route element={<RoleRoute allow={[ROLES.ADMIN, ROLES.ATTENDANT]} />}>
          <Route path="/admin" element={<AdminPanel />} />
        </Route>

        <Route element={<RoleRoute allow={[ROLES.ADMIN]} />}>
          <Route path="/dashboard-admin" element={<DashboardAdmin />} />
          <Route path="/premiacao" element={<ProviderAwards />} />
          <Route path="/agenda" element={<ProviderAgenda />} />
        </Route>

        <Route element={<RoleRoute allow={[ROLES.PROVIDER, ROLES.ADMIN]} />}>
          <Route path="/prestador/ganhos" element={<ProviderEarnings />} />
          <Route path="/prestador/horarios" element={<ProviderSchedule />} />
          <Route path="/dashboard-prestador" element={<ProviderDashboard />} />
          <Route path="/painel-metricas" element={<ProviderMetricsPanel />} />
          <Route path="/mapa/:requestId" element={<ProviderLocationMap />} />
          <Route path="/rastreamento/:requestId" element={<TrackingMap />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <SupabaseConfigGuard>
      <AuthProvider>
        <NotificationProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppRoutes />
            </Router>
            <Toaster />
            <SonnerToaster position="top-center" richColors />
          </QueryClientProvider>
        </NotificationProvider>
      </AuthProvider>
    </SupabaseConfigGuard>
  );
}

export default App;
