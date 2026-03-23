import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import SolicitarServico from './pages/SolicitarServico';
import AcompanharServico from './pages/AcompanharServico';
import ProviderApp from './pages/ProviderApp';
import AdminPanel from './pages/AdminPanel';
import ClientRegister from './pages/ClientRegister';
import ProviderRegister from './pages/ProviderRegister';
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
import { Toaster as SonnerToaster } from "sonner";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/solicitar" element={<SolicitarServico />} />
        <Route path="/acompanhar/:id" element={<AcompanharServico />} />
        <Route path="/meus-pedidos" element={<MeusPedidos />} />
        <Route path="/perfil" element={<UserProfile />} />
        <Route path="/prestador" element={<ProviderApp />} />
        <Route path="/prestador/:id" element={<ProviderProfile />} />
        <Route path="/prestador/ganhos" element={<ProviderEarnings />} />
        <Route path="/prestador/horarios" element={<ProviderSchedule />} />
        <Route path="/recompensas" element={<LoyaltyRewards />} />
        <Route path="/mapa/:requestId" element={<ProviderLocationMap />} />
        <Route path="/rastreamento/:requestId" element={<TrackingMap />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/cadastro" element={<ClientRegister />} />
        <Route path="/cadastro-prestador" element={<ProviderRegister />} />
        <Route path="/dashboard-prestador" element={<ProviderDashboard />} />
        <Route path="/termos-cliente" element={<TermosCliente />} />
        <Route path="/termos-prestador" element={<TermosPrestador />} />
        <Route path="/cadastro-parceiro" element={<PartnerRegister />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <SonnerToaster position="top-center" richColors />
        </QueryClientProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;