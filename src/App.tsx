import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AccentThemeProvider } from './contexts/AccentThemeContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { SyncProvider } from './contexts/SyncContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { AdminRoute } from './components/AdminRoute';
import { MusicPlayer } from './components/player/MusicPlayer';
import { BottomNav } from './components/layout/BottomNav';
import { SplashScreen } from './components/common/SplashScreen';
import { AndroidBackButtonHandler } from './components/common/AndroidBackButtonHandler';
import { AmbientBackground } from './components/AmbientBackground';

// Pages
import { Login }           from './pages/Login';
import { SignUp }          from './pages/SignUp';
import { ForgotPassword }  from './pages/ForgotPassword';
import { ResetPassword }   from './pages/ResetPassword';
import { Home }            from './pages/Home';
import { Profile }         from './pages/Profile';
import { Search }          from './pages/Search';
import { Admin }           from './pages/Admin';
import { UserProfile }     from './pages/UserProfile';
import { Library }         from './pages/Library';
import { Notifications }   from './pages/Notifications';
import { SyncPage }        from './pages/Sync';
import { PlaylistDetails } from './pages/PlaylistDetails';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});


// Layout wrapper: provides bottom nav + player for authenticated pages
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative min-h-screen pb-[calc(110px+env(safe-area-inset-bottom,0px))]">
    {children}
    <div className="fixed bottom-3 left-0 right-0 z-50 safe-bottom flex flex-col items-center gap-2">
      <MusicPlayer />
      <BottomNav />
    </div>
  </div>
);

function App() {
  return (
    <>
      <SplashScreen duration={2400} />
      <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AccentThemeProvider>
        <SettingsProvider>
          <PlayerProvider>
            <SyncProvider>
            <BrowserRouter>
              <AmbientBackground />
              <AndroidBackButtonHandler />
              <Routes>
              {/* ── Public Auth Routes ── */}
              <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/signup"          element={<PublicRoute><SignUp /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-password"  element={<PublicRoute><ResetPassword /></PublicRoute>} />

              {/* ── Protected App Routes ── */}
              <Route path="/"               element={<ProtectedRoute><AppLayout><Home /></AppLayout></ProtectedRoute>} />
              <Route path="/search"         element={<ProtectedRoute><AppLayout><Search /></AppLayout></ProtectedRoute>} />
              <Route path="/library"        element={<ProtectedRoute><AppLayout><Library /></AppLayout></ProtectedRoute>} />
               <Route path="/profile"        element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
               <Route path="/settings"        element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
               <Route path="/notifications"  element={<ProtectedRoute><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />
              <Route path="/sync"           element={<ProtectedRoute><AppLayout><SyncPage /></AppLayout></ProtectedRoute>} />
              <Route path="/playlist/:id"   element={<ProtectedRoute><AppLayout><PlaylistDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/user/:username" element={<ProtectedRoute><AppLayout><UserProfile /></AppLayout></ProtectedRoute>} />

              {/* ── Admin ── */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AppLayout><Admin /></AppLayout>
                  </AdminRoute>
                </ProtectedRoute>
              } />

              {/* ── Fallback ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </BrowserRouter>
          </SyncProvider>
          </PlayerProvider>
        </SettingsProvider>
        </AccentThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
    </>
  );
}

export default App;
