import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Shield,
  Lock,
  Server,
  Eye,
  Key,
  CheckCircle,
  AlertTriangle,
  Mail,
  FileText,
  Globe,
  Database,
  UserCheck,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const securityFeatures = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description:
      "All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. Your credential data never travels unprotected.",
  },
  {
    icon: Server,
    title: "Secure Infrastructure",
    description:
      "We host on SOC 2 Type II certified cloud infrastructure with redundant data centers, ensuring high availability and disaster recovery.",
  },
  {
    icon: Eye,
    title: "Privacy by Design",
    description:
      "We collect only the data necessary for our services and give you control over what's shared with employers through T3X Exchange.",
  },
  {
    icon: Key,
    title: "Access Controls",
    description:
      "Multi-factor authentication, role-based access, and principle of least privilege ensure only authorized access to sensitive data.",
  },
  {
    icon: UserCheck,
    title: "Identity Verification",
    description:
      "We verify mentor identities and qualifications to ensure the integrity of behavioral validations and credential authenticity.",
  },
  {
    icon: Database,
    title: "Data Isolation",
    description:
      "Employer data, candidate data, and credential observations are logically isolated with strict access boundaries.",
  },
];

const certifications = [
  {
    name: "SOC 2 Type II",
    description: "Audited controls for security, availability, and confidentiality",
  },
  {
    name: "GDPR Compliant",
    description: "Full compliance with European data protection regulations",
  },
  {
    name: "CCPA Compliant",
    description: "California Consumer Privacy Act compliance",
  },
  {
    name: "FERPA Compliant",
    description: "Student education records protection for Civic Access Lab",
  },
];

const securityPractices = [
  {
    title: "Regular Security Assessments",
    items: [
      "Annual third-party penetration testing",
      "Quarterly vulnerability scans",
      "Continuous automated security monitoring",
      "Regular code security reviews",
    ],
  },
  {
    title: "Incident Response",
    items: [
      "24/7 security monitoring and alerting",
      "Documented incident response procedures",
      "Breach notification within 72 hours",
      "Post-incident analysis and improvement",
    ],
  },
  {
    title: "Employee Security",
    items: [
      "Background checks for all employees",
      "Security awareness training",
      "Strict access provisioning and deprovisioning",
      "Clean desk and device policies",
    ],
  },
  {
    title: "Development Security",
    items: [
      "Secure software development lifecycle (SSDLC)",
      "Code review requirements",
      "Dependency vulnerability scanning",
      "Staging environment testing",
    ],
  },
];

const Security = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <BackgroundVideo />
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/50 via-black to-black" />
        <motion.div
          className="absolute top-20 right-20 w-96 h-96 bg-indigo-900 rounded-full opacity-20 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-80 h-80 bg-purple-900 rounded-full opacity-20 blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm">
                <Shield className="w-4 h-4" />
                Security
              </span>
            </motion.div>
            <motion.h1
              variants={itemVariants}
              className="text-3xl md:text-4xl font-display font-normal mb-6"
            >
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                Your Security
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Is Our Priority
              </span>
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-400 mb-8"
            >
              We implement industry-leading security measures to protect your
              personal information, credentials, and behavioral data.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Security Features
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Comprehensive security measures at every layer of our platform.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group relative"
              >
                <div className="absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600 transition-opacity duration-500" />
                <div className="relative p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 h-full">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/20 to-black" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Compliance & Certifications
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              We maintain compliance with industry standards and regulations.
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {certifications.map((cert, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-600/20 to-emerald-600/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {cert.name}
                </h3>
                <p className="text-gray-400 text-sm">{cert.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Security Practices */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Our Security Practices
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              How we protect your data through robust security operations.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {securityPractices.map((practice, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  {practice.title}
                </h3>
                <ul className="space-y-3">
                  {practice.items.map((item, itemIndex) => (
                    <li
                      key={itemIndex}
                      className="flex items-start gap-3 text-gray-400 text-sm"
                    >
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Bug Bounty / Responsible Disclosure */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/20 to-black" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative group">
              <div className="absolute -inset-2 rounded-3xl opacity-30 blur-xl bg-gradient-to-r from-indigo-600 to-purple-600" />
              <div className="relative p-8 md:p-12 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                <div className="flex flex-col md:flex-row items-start gap-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600/20 to-orange-600/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-bold mb-4">
                      <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        Responsible Disclosure
                      </span>
                    </h2>
                    <p className="text-gray-400 mb-6">
                      We value the security research community. If you discover a
                      vulnerability, please report it responsibly. We commit to:
                    </p>
                    <ul className="space-y-2 text-gray-400 text-sm mb-6">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Acknowledging reports within 24 hours
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Working with you to understand the issue
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Not taking legal action against good-faith researchers
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Providing recognition for valid reports
                      </li>
                    </ul>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        asChild
                      >
                        <a href="mailto:security@the3rdacademy.com">
                          <Mail className="mr-2 h-4 w-4" />
                          Report a Vulnerability
                        </a>
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Related Links */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-8">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Related Resources
              </span>
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  asChild
                >
                  <Link to="/privacy">
                    <FileText className="mr-2 h-4 w-4" />
                    Privacy Policy
                  </Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  asChild
                >
                  <Link to="/terms">
                    <Globe className="mr-2 h-4 w-4" />
                    Terms of Service
                  </Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  asChild
                >
                  <Link to="/help">
                    <Mail className="mr-2 h-4 w-4" />
                    Help Center
                  </Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Security;
