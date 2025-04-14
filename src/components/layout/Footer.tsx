
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Github, Mail } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-dark-600 border-t border-ottoman-900/50 animate-fade-in">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: About */}
          <div>
            <h3 className="text-xl font-serif font-semibold text-ottoman-100 mb-4">Ottoman Archive</h3>
            <p className="text-ottoman-300 text-sm mb-4">
              A comprehensive platform for Ottoman Empire banknote collectors, featuring a robust catalog, 
              collection management tools, marketplace, and community features.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-ottoman-400 hover:text-ottoman-300 transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-ottoman-400 hover:text-ottoman-300 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-ottoman-400 hover:text-ottoman-300 transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-ottoman-400 hover:text-ottoman-300 transition-colors">
                <Github size={20} />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-xl font-serif font-semibold text-ottoman-100 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/catalog" className="text-ottoman-300 hover:text-ottoman-100 text-sm transition-colors">Banknote Catalog</Link>
              </li>
              <li>
                <Link to="/marketplace" className="text-ottoman-300 hover:text-ottoman-100 text-sm transition-colors">Marketplace</Link>
              </li>
              <li>
                <Link to="/community" className="text-ottoman-300 hover:text-ottoman-100 text-sm transition-colors">Community Forum</Link>
              </li>
              <li>
                <Link to="/collection" className="text-ottoman-300 hover:text-ottoman-100 text-sm transition-colors">My Collection</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="text-xl font-serif font-semibold text-ottoman-100 mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/resources/grading-guide" className="text-ottoman-300 hover:text-ottoman-100 text-sm transition-colors">Grading Guide</Link>
              </li>
              <li>
                <Link to="/resources/authentication" className="text-ottoman-300 hover:text-ottoman-100 text-sm transition-colors">Authentication Tips</Link>
              </li>
              <li>
                <Link to="/resources/history" className="text-ottoman-300 hover:text-ottoman-100 text-sm transition-colors">Ottoman Banknote History</Link>
              </li>
              <li>
                <Link to="/resources/regions" className="text-ottoman-300 hover:text-ottoman-100 text-sm transition-colors">Regional Issues Guide</Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h3 className="text-xl font-serif font-semibold text-ottoman-100 mb-4">Contact Us</h3>
            <p className="text-ottoman-300 text-sm mb-2 flex items-center">
              <Mail size={16} className="mr-2" /> support@ottomanarchive.com
            </p>
            <p className="text-ottoman-300 text-sm">
              Have questions or suggestions? Feel free to reach out to us.
            </p>
            <form className="mt-4">
              <input
                type="email"
                placeholder="Your email address"
                className="w-full px-4 py-2 rounded-md bg-dark-500 border border-ottoman-800 text-ottoman-100 text-sm focus:outline-none focus:border-ottoman-600 mb-2"
              />
              <button
                type="submit"
                className="w-full bg-ottoman-600 hover:bg-ottoman-700 text-white rounded-md py-2 text-sm transition-colors"
              >
                Subscribe to Newsletter
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-ottoman-900/50 flex flex-col md:flex-row justify-between items-center">
          <p className="text-ottoman-400 text-xs md:text-sm">
            &copy; {new Date().getFullYear()} Ottoman Banknote Archive. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/privacy" className="text-ottoman-400 hover:text-ottoman-200 text-xs md:text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-ottoman-400 hover:text-ottoman-200 text-xs md:text-sm transition-colors">
              Terms of Service
            </Link>
            <Link to="/help" className="text-ottoman-400 hover:text-ottoman-200 text-xs md:text-sm transition-colors">
              Help Center
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
