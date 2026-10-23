/** Source-derived Sapphire Flow signature; the supplied PDF's pixels are preserved. */
export function BrandLogo({ symbolOnly = false }: { symbolOnly?: boolean }) {
  return <span className={`inline-flex shrink-0 items-center gap-3 p-3 ${symbolOnly ? '' : 'min-w-[200px]'}`}>
    <span aria-hidden="true" className="relative block size-12 shrink-0">
      <img className="brand-symbol-light" src="/brand/symbol-light.png" width="48" height="48" alt=""/>
      <img className="brand-symbol-dark" src="/brand/symbol-dark.png" width="48" height="48" alt=""/>
    </span>
    {!symbolOnly && <span className="text-heading"><span className="brand-wordmark block text-[30px] leading-9">Creident</span><span className="brand-tagline block whitespace-nowrap text-xs leading-5">Every deal, on record.</span></span>}
    {symbolOnly && <span className="sr-only">Creident</span>}
  </span>;
}
