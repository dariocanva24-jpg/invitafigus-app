import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'
import { captureUtm } from './services/utm'

const params = new URLSearchParams(window.location.search)
// Un link de invitación (?utm_source=invitacion) no debe pisar la campaña del organizador.
if (params.get('utm_source') !== 'invitacion') captureUtm()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)