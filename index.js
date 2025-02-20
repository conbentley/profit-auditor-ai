import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Home } from "./pages/Home";
import { Features } from "./pages/Features";
import { About } from "./pages/About";
import { Pricing } from "./pages/Pricing";
import { Blog } from "./pages/Blog";

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/about" element={<About />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/blog" element={<Blog />} />
      </Routes>
      <Footer />
    </Router>
  );
}

function Navbar() {
  return (
    <nav className="flex justify-between items-center p-4 shadow-md bg-white">
      <Link to="/" className="text-2xl font-bold">ClearProfit AI</Link>
      <div className="space-x-6">
        <Link to="/features" className="hover:underline">Features</Link>
        <Link to="/about" className="hover:underline">About</Link>
        <Link to="/pricing" className="hover:underline">Pricing</Link>
        <Link to="/blog" className="hover:underline">Blog</Link>
      </div>
      <div className="space-x-4">
        <a href="https://profit-auditor-ai.lovable.app/signin" className="text-blue-600 hover:underline">Sign In</a>
        <a href="https://profit-auditor-ai.lovable.app/signup" className="bg-blue-600 text-white px-4 py-2 rounded-md">Sign Up Free</a>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="p-4 text-center bg-gray-100 mt-8">
      <p>&copy; 2025 ClearProfit AI. All rights reserved.</p>
    </footer>
  );
}
