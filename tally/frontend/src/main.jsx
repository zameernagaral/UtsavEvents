import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ClockedOutApp from './ClockedOut/App'
import DuosDashApp from './duosDash4.0/App'
import './duosDash4.0/index.css'
import Home from "./Home";
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
    <Routes>
  <Route path="*" element={<Home />} />
  
  <Route path="/clockedout/*" element={<ClockedOutApp />} />
  
  <Route path="/duosdash/*" element={<DuosDashApp />} />
  <Route path="/duosdash4.0/*" element={<DuosDashApp />} />
</Routes>
    </BrowserRouter>
  </React.StrictMode>
)