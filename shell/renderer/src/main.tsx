import * as ReactDom from 'react-dom'
import { createRoot } from 'react-dom/client'
import * as Recharts from 'recharts'
import * as Lucide from 'lucide-react'
import * as DateFns from 'date-fns'
import { registerHostModules } from 'neovai-kernel/cards/live-ui/react'
import { PANEL_LIBRARIES } from '../../shared/api'
import 'neovai-kernel/cards/chat-view/styles.css'
import 'neovai-kernel/cards/live-ui/styles.css'
import App from './App'
import './styles.css'

// Code panels in the workspace import React, the panel API and these libraries from the app.
const libs: Record<(typeof PANEL_LIBRARIES)[number], unknown> = { recharts: Recharts, 'lucide-react': Lucide, 'date-fns': DateFns }
registerHostModules({ 'react-dom': ReactDom, ...libs })

createRoot(document.getElementById('root')!).render(<App />)
