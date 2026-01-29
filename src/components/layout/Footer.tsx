import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Github, Twitter, Linkedin } from "lucide-react";

const footerLinks = {
  platform: [
    { name: "Skill Passport", href: "/platform#skill-passport" },
    { name: "MentorLink", href: "/platform#mentorlink" },
    { name: "BridgeFast", href: "/platform#bridgefast" },
    { name: "LiveWorks Studio", href: "/platform#liveworks" },
    { name: "T3X Exchange", href: "/platform#t3x" },
  ],
  company: [
    { name: "About Us", href: "/about" },
    { name: "Careers", href: "/careers" },
    { name: "Press", href: "/press" },
    { name: "Contact", href: "/contact" },
  ],
  resources: [
    { name: "For Employers", href: "/employers" },
    { name: "For Schools", href: "/schools" },
    { name: "Blog", href: "/blog" },
    { name: "Help Center", href: "/help" },
  ],
  legal: [
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
    { name: "Security", href: "/security" },
  ],
};

const socialLinks = [
  { name: "GitHub", icon: Github, href: "#" },
  { name: "Twitter", icon: Twitter, href: "#" },
  { name: "LinkedIn", icon: Linkedin, href: "#" },
];

export function Footer() {
  return (
    <footer className="bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center mb-6">
              <motion.div className="flex items-center" whileHover={{ scale: 1.05 }}>
                <img
                  src="https://api.a0.dev/assets/image?text=Futuristic AI-powered academy logo with glowing blue circuit patterns and neural networks&aspect=1:1&seed=academy_logo"
                  alt="The 3rd Academy Logo"
                  className="h-10 w-10 mr-2 rounded-full shadow-lg"
                />
                <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  The 3rd Academy
                </span>
              </motion.div>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Bridging the gap between credentials and workplace readiness through
              mentor-gated behavioral validation.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <social.icon className="w-4 h-4" />
                  <span className="sr-only">{social.name}</span>
                </motion.a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Platform</h3>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-gray-500 hover:text-white transition-colors"
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
                    className="text-sm text-gray-500 hover:text-white transition-colors"
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
                    className="text-sm text-gray-500 hover:text-white transition-colors"
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
                    className="text-sm text-gray-500 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} The 3rd Academy. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs text-gray-600 bg-white/5 px-3 py-1 rounded-full">
              Behavioral Readiness Platform
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
