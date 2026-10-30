import Image from 'next/image';

/** Approved raster artwork, cropped without redrawing the letterforms. */
export function BrandWordmark({ inverse = false, className = '' }: { inverse?: boolean; className?: string }) {
  return <span className={`inline-block shrink-0 ${className}`}>
    {!inverse && <Image className="brand-symbol-light h-full w-auto" src="/brand/v3/wordmark-light.png" width={992} height={200} alt="Creident" loading="eager" unoptimized/>}
    <Image className={`${inverse ? '' : 'brand-symbol-dark '}h-full w-auto`} src="/brand/v3/wordmark-dark.png" width={960} height={188} alt="Creident" loading="eager" unoptimized/>
  </span>;
}

export function BrandLogo({ symbolOnly = false }: { symbolOnly?: boolean }) {
  if (symbolOnly) return <span className="inline-block shrink-0 p-3"><Image className="brand-symbol-light h-12 w-auto" src="/brand/v3/mark.png" width={102} height={110} alt="Creident" unoptimized/><Image className="brand-symbol-dark h-12 w-auto" src="/brand/v3/mark-dark.png" width={168} height={188} alt="Creident" unoptimized/></span>;
  return <span className="inline-flex shrink-0 flex-col gap-1 p-3"><BrandWordmark className="h-[30px]"/><span className="brand-tagline text-xs leading-5 text-heading">Every deal, on record.</span></span>;
}
