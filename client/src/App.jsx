import { Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import { ProtectedRoute } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Workers from './pages/Workers.jsx';
import WorkerDetail from './pages/WorkerDetail.jsx';
import PublicCard from './pages/PublicCard.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Bookings from './pages/Bookings.jsx';
import WorkerDashboard from './pages/WorkerDashboard.jsx';
import QRCardPage from './pages/QRCardPage.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/workers/:id" element={<WorkerDetail />} />
          <Route path="/w/:token" element={<PublicCard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/bookings" element={<ProtectedRoute roles={['customer', 'worker']}><Bookings /></ProtectedRoute>} />
          <Route path="/worker/dashboard" element={<ProtectedRoute roles={['worker']}><WorkerDashboard /></ProtectedRoute>} />
          <Route path="/worker/card" element={<ProtectedRoute roles={['worker']}><QRCardPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Admin /></ProtectedRoute>} />
          <Route path="*" element={<div className="p-10 text-center"><p className="text-xl font-bold">Page not found</p><Link to="/" className="underline">Go home</Link></div>} />
        </Routes>
      </main>
    </>
  );
}
