import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <p className="text-8xl font-black text-slate-200">404</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Page not found</h1>
        <p className="text-slate-500 mt-1 mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/overview" className="px-5 py-2.5 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
