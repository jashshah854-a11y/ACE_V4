import { Link } from "react-router-dom";

export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">ACE</span>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Autonomous Customer Intelligence
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link 
            to="/" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Home
          </Link>
          <Link 
            to="/reports" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Reports
          </Link>
        </div>
      </div>
    </nav>
  );
};
