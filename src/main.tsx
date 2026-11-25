import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Entry point: find <div id="root"> in index.html and render the App inside it.
// (React's <StrictMode> is left out because it double-mounts the 3D labels in development.)
createRoot(document.getElementById('root')!).render(<App />)
