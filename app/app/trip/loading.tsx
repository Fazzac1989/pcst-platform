/** Instant skeleton while the next page's data loads — makes tab switches feel immediate. */
export default function TripLoading() {
  return (
    <div className="papp-loading" aria-busy="true">
      <div className="papp-skel papp-skel-title" />
      <div className="papp-skel papp-skel-block" />
      <div className="papp-skel papp-skel-block short" />
    </div>
  );
}
