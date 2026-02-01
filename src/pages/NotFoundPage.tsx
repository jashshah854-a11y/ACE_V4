import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-muted-foreground/30">404</h1>
        <h2 className="text-xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <Button asChild>
            <Link to="/">New Analysis</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/reports">View Reports</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
