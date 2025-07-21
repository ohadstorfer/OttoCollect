
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-500 p-4 animate-fade-in -mb-20">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 w-24 h-24 rounded-full bg-ottoman-800/50 flex items-center justify-center mx-auto">
          <span className="text-4xl font-serif font-bold text-ottoman-300">404</span>
        </div>
        <h1 className="text-3xl font-serif font-bold mb-4 text-parchment-500"><span>Page Not Found</span></h1>
        <p className="text-ottoman-300 mb-8">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link to="/">
          <Button className="ottoman-button">
            <Home className="h-4 w-4 mr-2" />
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
