'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { TechnicalDetails } from './TechnicalDetails';

interface EvidenceTechnical { id: string; label: string; sourceHash: string }
interface TranslationTechnical { translationHash: string | null }
const ReviewTechnicalContext = createContext<((id: string, value: TranslationTechnical) => void) | null>(null);
export const useReviewTechnical = () => useContext(ReviewTechnicalContext);

/** Collect display-only translation hashes without changing translation requests or results. */
export function ReviewTechnical({ evidence, recommendation, references, children }: {
  evidence: EvidenceTechnical[]; recommendation: string; references: string[]; children: ReactNode;
}) {
  const [translations, setTranslations] = useState<Record<string, TranslationTechnical>>({});
  return <ReviewTechnicalContext.Provider value={(id, value) => setTranslations(current => ({ ...current, [id]: value }))}>
    {children}
    <div id="review-technical" className="mt-5"><TechnicalDetails>
      <p>Recorded recommendation: {recommendation}</p>
      {references.map((value, index) => <p key={index}>Evidence references: {value}</p>)}
      {evidence.map(item => <div key={item.id} className="space-y-1 border-t border-line pt-3">
        <p className="font-semibold text-heading">{item.label}</p>
        <p className="break-all font-mono text-sm">Original SHA-256: {item.sourceHash}</p>
        {translations[item.id]?.translationHash && <p className="break-all font-mono text-sm">Translation SHA-256: {translations[item.id]?.translationHash}</p>}
      </div>)}
    </TechnicalDetails></div>
  </ReviewTechnicalContext.Provider>;
}
