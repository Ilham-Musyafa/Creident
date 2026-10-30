/** Presentation only: stored titles and payment/API payloads stay unchanged. */
export function displayItemName(value: string): string {
  return value.replace(/^\[Demo\]\s*/i, '') || value;
}
