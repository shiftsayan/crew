import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Passport } from "@/components/ui/Passport";

export default function NotFound() {
  return (
    <main
      className="relative isolate grid h-dvh min-h-0 w-full place-items-center overflow-hidden p-2 sm:p-8"
      id="main-content"
    >
      <Passport
        role="region"
        aria-labelledby="not-found-title"
        title="Page not found"
        titleId="not-found-title"
        subtitle="The page you requested does not exist."
      >
        <Button asChild>
          <Link href="/">Return to homepage</Link>
        </Button>
      </Passport>
    </main>
  );
}
