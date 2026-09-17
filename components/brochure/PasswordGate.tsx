import '@/components/brochure/gate.css';

/**
 * The gate on a bespoke proposal.
 *
 * A plain GET form: the password goes to the server, which compares hashes and
 * only then loads any content. Nothing about the brochure — not its title beyond
 * what the sender already shared, not its cover — is sent until it matches.
 */
export default function PasswordGate({ title, wrong }: { title: string; wrong: boolean }) {
  return (
    <div className="bgate">
      <form method="get">
        <h1>{title}</h1>
        <p>This brochure was prepared for a specific school. Enter the password you were sent.</p>
        <input
          type="password"
          name="pw"
          placeholder="Password"
          autoFocus
          autoComplete="off"
          aria-label="Brochure password"
        />
        {wrong && <p className="bgate-error">That password did not match. Try again.</p>}
        <button type="submit">View brochure</button>
      </form>
    </div>
  );
}
