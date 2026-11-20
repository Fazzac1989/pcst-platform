/** The PDF download for a proposal, carrying whichever pass the reader holds. */
export function proposalPdfHref(id: number, shareToken?: string, previewToken?: string): string {
  if (shareToken) return `/api/proposals/${id}/pdf?token=${encodeURIComponent(shareToken)}`;
  if (previewToken) return `/api/proposals/${id}/pdf?preview=${encodeURIComponent(previewToken)}`;
  return `/api/proposals/${id}/pdf`;
}
