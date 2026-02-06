import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] gap-4">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <Link to="/">
        <Button variant="outline">Go back home</Button>
      </Link>
    </div>
  );
}
