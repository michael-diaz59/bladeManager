import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Participants } from './pages/Participants';
import { Leagues } from './pages/Leagues';
import { LeagueDetail } from './pages/LeagueDetail';
import { TournamentManager } from './pages/TournamentManager';
import { Tournaments } from './pages/Tournaments';
import { Config } from './pages/Config';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/participants" element={<Participants />} />
          <Route path="/leagues" element={<Leagues />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/league/:id" element={<LeagueDetail />} />
          <Route path="/tournament/:id" element={<TournamentManager />} />
          <Route path="/config" element={<Config />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;