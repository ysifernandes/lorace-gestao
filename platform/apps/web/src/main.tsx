import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { brand, brandCssVars } from '@edu/brand';
import '@fontsource-variable/nunito';
import './theme/theme.css';
import './theme/mascot.css';
import './theme/aprendix.css';
import App from './App';

// Marca: tokens do pacote brand viram variáveis CSS; título vem da mesma fonte.
const env = import.meta.env as Record<string, string | undefined>;
if (env.VITE_BRAND_NAME) brand.name = env.VITE_BRAND_NAME;
for (const [k, v] of Object.entries(brandCssVars())) document.documentElement.style.setProperty(k, v);
document.title = brand.name;
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
