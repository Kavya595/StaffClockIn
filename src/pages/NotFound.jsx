import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import Button from "../components/common/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-ink bg-gradient-mesh px-4 text-center relative overflow-hidden">
      <div className="absolute -top-32 -right-20 w-96 h-96 rounded-full bg-brass/15 blur-3xl animate-blob" />
      <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-sky/10 blur-3xl animate-blob" style={{ animationDelay: "2s" }} />
      <div className="relative animate-fade-up">
        <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center mb-5 mx-auto shadow-glow">
          <Compass size={28} className="text-white" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-white mb-1">Page not found</h1>
        <p className="text-sm text-ink-300 mb-6 max-w-xs mx-auto">The page you're looking for doesn't exist or may have moved.</p>
        <Link to="/">
          <Button variant="accent">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
