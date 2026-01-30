import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
import { Footer } from "@/components/layout/Footer";
import { Shield, Calendar, Mail } from "lucide-react";

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

const sections = [
  {
    title: "1. Information We Collect",
    content: `We collect information you provide directly to us, including:

**Personal Information:** When you create an account, we collect your name, email address, phone number, and professional information such as your resume, work history, and educational background.

**Behavioral Data:** Through our MentorLink sessions and platform interactions, we collect observations about your professional behaviors, skills demonstrations, and growth progress. This data forms the basis of your Skill Passport credential.

**Usage Information:** We automatically collect information about how you interact with our platform, including pages visited, features used, and time spent on various activities.

**Device Information:** We collect information about the device you use to access our platform, including device type, operating system, browser type, and IP address.`,
  },
  {
    title: "2. How We Use Your Information",
    content: `We use the information we collect to:

**Provide Our Services:** Process your credential applications, facilitate mentor matches, and generate your Skill Passport and Growth Log.

**Improve Our Platform:** Analyze usage patterns to enhance our platform features, training modules, and user experience.

**Connect You With Opportunities:** Share your verified credentials with employers through T3X Exchange when you opt in to our talent marketplace.

**Communicate With You:** Send you updates about your progress, mentor session reminders, and important platform announcements.

**Ensure Security:** Detect and prevent fraud, abuse, and security threats to protect our users and platform integrity.`,
  },
  {
    title: "3. Information Sharing",
    content: `We share your information only in the following circumstances:

**With Your Consent:** We share your Skill Passport and credential information with employers only when you explicitly authorize it through T3X Exchange.

**With Mentors:** Your professional information and session history are shared with assigned mentors to facilitate effective validation sessions.

**With Schools:** If you're participating through Civic Access Lab, relevant progress information may be shared with your educational institution.

**Service Providers:** We work with third-party service providers who help us operate our platform, including cloud hosting, analytics, and communication tools. These providers are bound by confidentiality agreements.

**Legal Requirements:** We may disclose information when required by law or to protect the rights, safety, and property of The 3rd Academy, our users, or others.`,
  },
  {
    title: "4. Data Security",
    content: `We implement industry-standard security measures to protect your information:

**Encryption:** All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption.

**Access Controls:** We maintain strict access controls, ensuring only authorized personnel can access sensitive information on a need-to-know basis.

**Regular Audits:** We conduct regular security assessments and penetration testing to identify and address vulnerabilities.

**Incident Response:** We maintain a comprehensive incident response plan to quickly address any security events.

For more details about our security practices, please visit our [Security page](/security).`,
  },
  {
    title: "5. Your Rights and Choices",
    content: `You have the following rights regarding your personal information:

**Access:** You can request a copy of the personal information we hold about you.

**Correction:** You can update or correct inaccurate information in your account settings or by contacting us.

**Deletion:** You can request deletion of your account and associated data, subject to legal retention requirements.

**Portability:** You can request your data in a portable format to transfer to another service.

**Opt-Out:** You can opt out of marketing communications and control your visibility on T3X Exchange.

**Credential Control:** You maintain ownership of your Skill Passport and can choose which employers can view your credentials.

To exercise these rights, please contact us at privacy@the3rdacademy.com.`,
  },
  {
    title: "6. Data Retention",
    content: `We retain your information for as long as necessary to:

- Provide our services and maintain your credentials
- Comply with legal obligations
- Resolve disputes and enforce our agreements

**Credential Data:** Your Skill Passport and Growth Log are retained for the duration of your account plus 7 years to maintain credential validity for employers.

**Session Recordings:** Mentor session recordings are retained for 2 years for quality assurance and dispute resolution.

**Account Deletion:** Upon account deletion request, we will remove your personal information within 30 days, except where retention is required by law.`,
  },
  {
    title: "7. Children's Privacy",
    content: `The 3rd Academy's general platform is intended for users 18 years and older.

**Civic Access Lab:** Our school program serves students under 18 with appropriate parental/guardian consent and school authorization. We collect limited information necessary for the program and maintain enhanced protections for minor users.

We do not knowingly collect personal information from children under 13 without verifiable parental consent.`,
  },
  {
    title: "8. International Data Transfers",
    content: `The 3rd Academy is based in the United States. If you access our platform from outside the US, your information may be transferred to, stored, and processed in the US or other countries where our service providers operate.

We implement appropriate safeguards for international transfers, including Standard Contractual Clauses approved by relevant data protection authorities.`,
  },
  {
    title: "9. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.

We will notify you of material changes by:
- Posting a notice on our platform
- Sending an email to your registered address
- Requiring acknowledgment before continued platform use

Your continued use of our platform after changes become effective constitutes acceptance of the updated policy.`,
  },
  {
    title: "10. Contact Us",
    content: `If you have questions about this Privacy Policy or our data practices, please contact us:

**Email:** privacy@the3rdacademy.com

**Mail:**
The 3rd Academy
Privacy Team
123 Innovation Way
San Francisco, CA 94105

**Data Protection Officer:** dpo@the3rdacademy.com

For EU residents, you also have the right to lodge a complaint with your local data protection authority.`,
  },
];

const Privacy = () => {
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
                Legal
              </span>
            </motion.div>
            <motion.h1
              variants={itemVariants}
              className="text-3xl md:text-4xl font-display font-normal mb-6"
            >
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                Privacy
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Policy
              </span>
            </motion.h1>
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center gap-4 text-sm text-gray-400"
            >
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Last updated: January 15, 2026
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Introduction */}
            <motion.div
              variants={itemVariants}
              className="mb-12 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
            >
              <p className="text-gray-300 leading-relaxed">
                At The 3rd Academy, we are committed to protecting your privacy and
                ensuring the security of your personal information. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your information
                when you use our platform and services.
              </p>
              <p className="text-gray-300 leading-relaxed mt-4">
                By using The 3rd Academy, you agree to the collection and use of
                information in accordance with this policy. If you do not agree with
                our policies and practices, please do not use our services.
              </p>
            </motion.div>

            {/* Sections */}
            <div className="space-y-8">
              {sections.map((section, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="group"
                >
                  <h2 className="text-xl font-semibold text-white mb-4">
                    {section.title}
                  </h2>
                  <div className="text-gray-400 leading-relaxed whitespace-pre-line prose prose-invert prose-sm max-w-none">
                    {section.content.split('\n\n').map((paragraph, pIndex) => (
                      <p key={pIndex} className="mb-4">
                        {paragraph.split('**').map((part, partIndex) =>
                          partIndex % 2 === 1 ? (
                            <strong key={partIndex} className="text-white font-medium">
                              {part}
                            </strong>
                          ) : (
                            part
                          )
                        )}
                      </p>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Contact Box */}
            <motion.div
              variants={itemVariants}
              className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 text-center"
            >
              <Mail className="w-8 h-8 text-indigo-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Questions About Privacy?
              </h3>
              <p className="text-gray-400 mb-4">
                Contact our privacy team for any questions or concerns.
              </p>
              <a
                href="mailto:privacy@the3rdacademy.com"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                privacy@the3rdacademy.com
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Privacy;
