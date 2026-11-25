import Link from "next/link";
import { Fan } from "lucide-react";

export function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark" aria-hidden="true">
        <Fan size={22} strokeWidth={1.8} />
      </span>
      HVAC Connect
    </Link>
  );
}
