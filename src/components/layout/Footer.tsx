import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const footerLinks = {
  platform: [
    { name: "Platform Overview", href: "/platform" },
    { name: "For Candidates", href: "/get-started" },
    { name: "For Employers", href: "/employers" },
    { name: "For Schools", href: "/schools" },
  ],
  company: [
    { name: "About Us", href: "/about" },
    { name: "Careers", href: "/careers" },
    { name: "Press", href: "/press" },
    { name: "Contact", href: "/contact" },
  ],
  resources: [
    { name: "Get Started", href: "/get-started" },
    { name: "Blog", href: "/blog" },
    { name: "Help Center", href: "/help" },
  ],
  legal: [
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
    { name: "Security", href: "/security" },
  ],
};

export function Footer() {
  return (
    <footer className="relative z-10 bg-black/95 backdrop-blur-xl border-t border-white/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center mb-6">
              <motion.div className="flex items-center" whileHover={{ scale: 1.05 }}>
                <img
                  src="/icon-192.png"
                  alt="The 3rd Academy Logo"
                  className="h-10 w-10 mr-2 rounded-full shadow-lg"
                />
                <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  The 3rd Academy
                </span>
              </motion.div>
            </Link>
            <p className="text-sm text-gray-300 leading-relaxed">
              Bridging the gap between credentials and workplace readiness through
              mentor-gated behavioral validation.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Platform</h3>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} The 3rd Academy. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs text-gray-400 bg-black px-3 py-1 rounded-full">
              Behavioral Readiness Platform
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
