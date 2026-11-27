import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import HomePage from './pages/HomePage'
import InvitationPage from './pages/InvitationPage'
import CreatePage from './pages/CreatePage'
import AdminPage from './pages/AdminPage'
import OrganizerPanelPage from './pages/OrganizerPanelPage'
import PrintInvitationPage from './pages/PrintInvitationPage'
// La ruta /poc-foto (prueba de subida a Drive) se quitó de producción por seguridad.

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/invitacion/:slug" element={<InvitationPage />} />
        <Route path="/crear" element={<CreatePage />} />
        <Route path="/panel/:slug" element={<OrganizerPanelPage />} />
        <Route path="/admin" element={<AdminPage />} />
        {/* Invitación impresa: se abre desde el panel o desde el link y se
            guarda como PDF / se manda a la imprenta. */}
        <Route path="/imprimir/:slug" element={<PrintInvitationPage />} />
      </Routes>
    </AppProvider>
  )
}

export default App