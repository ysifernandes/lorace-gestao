import { brand } from '@edu/brand';
import { Axolotl, MASCOT_STATES } from '../ui/axolotl';
import { Wordmark } from '../ui/art';

/** Biblioteca visual da marca e do mascote (rota pública /marca). */
export function BrandGallery() {
  return <div className="brand-gallery"><header><Wordmark /><h1>Identidade visual</h1><p>{brand.name} é nome provisório. {brand.trademarkNote}</p></header>
    <section aria-label="Estados do mascote"><h2>Mascote: estados</h2><div className="bg-grid">{MASCOT_STATES.map((s) => <figure key={s.id} data-state={s.id}><div className="bg-stage"><Axolotl state={s.id} size={150} cap={s.id === 'apresentando' || s.id === 'estudando'} /></div><figcaption><b>{s.nome}</b><span>{s.uso}</span></figcaption></figure>)}</div></section>
    <section><h2>Acessório e tamanhos</h2><div className="bg-grid small">{[48, 72, 110].map((z) => <div key={z} className="bg-stage"><Axolotl state="feliz" size={z} cap /></div>)}</div></section>
    <section><h2>Paleta</h2><div className="bg-swatches">{Object.entries(brand.colors).map(([k, v]) => <span key={k}><i style={{ background: v }} />{k}<code>{v}</code></span>)}</div></section></div>;
}
