import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { SessionProvider } from './lib/session-context'
import Deck from './pages/Deck'
import Join from './pages/Join'
import Wall from './pages/Wall'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Deck />} />
          <Route path="/join" element={<Join />} />
          <Route path="/wall" element={<Wall />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  </StrictMode>,
)
