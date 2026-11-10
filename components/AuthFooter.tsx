import Link from "next/link";

export function AuthFooter() {
  return (
    <footer className="ceter-auth-footer">
      <Link href="/contact">FAQs</Link>
      <Link href="/privacy-policy">Policy</Link>
      <Link href="/terms-conditions">Terms</Link>
    </footer>
  );
}
