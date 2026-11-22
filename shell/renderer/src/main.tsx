import { createRoot } from 'react-dom/client'
import { registerHostModules } from 'neovai-kernel/cards/live-ui/react'
import 'neovai-kernel/cards/chat-view/styles.css'
import 'neovai-kernel/cards/live-ui/styles.css'
import App from './App'
import './styles.css'

// Code panels in the workspace import React from the app.
registerHostModules()

createRoot(document.getElementById('root')!).render(<App />)
