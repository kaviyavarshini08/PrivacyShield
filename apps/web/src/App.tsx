import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes';
import { Toaster } from 'sonner';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
