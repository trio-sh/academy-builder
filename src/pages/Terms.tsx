import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";
import { Footer } from "@/components/layout/Footer";
import { FileText, Calendar, Mail } from "lucide-react";

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
    title: "1. Acceptance of Terms",
    content: `By accessing or using The 3rd Academy platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.

These Terms apply to all users of the Service, including candidates, mentors, employers, and educational institutions ("Users").

We reserve the right to update these Terms at any time. We will notify you of material changes by posting the new Terms on our platform and updating the "Last updated" date. Your continued use of the Service after changes become effective constitutes acceptance of the revised Terms.`,
  },
  {
    title: "2. Description of Service",
    content: `The 3rd Academy provides a behavioral readiness and credentialing platform that includes:

**Skill Passport:** A behavioral credential earned through mentor-validated observations of workplace readiness competencies.

**MentorLink:** A system connecting candidates with industry mentors for behavioral validation sessions.

**Growth Log:** A continuous record of behavioral observations and professional development progress.

**BridgeFast:** Short-form training modules designed to address specific behavioral gaps.

**LiveWorks Studio:** A supervised project marketplace for practical experience opportunities.

**T3X Exchange:** An employer marketplace for accessing verified candidate profiles.

**Civic Access Lab:** A school-based program for early career awareness and readiness.

We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time with reasonable notice.`,
  },
  {
    title: "3. User Accounts",
    content: `**Account Creation:** You must provide accurate, complete, and current information when creating an account. You are responsible for maintaining the confidentiality of your account credentials.

**Account Types:** Different account types (Candidate, Mentor, Employer, School Administrator) have different features and responsibilities. You agree to use your account only for its intended purpose.

**Age Requirements:** You must be at least 18 years old to create a Candidate or Mentor account. Civic Access Lab participants under 18 require parental/guardian consent and school authorization.

**Account Security:** You are responsible for all activities under your account. Notify us immediately of any unauthorized use or security breach.

**Account Termination:** We may suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or remain inactive for extended periods.`,
  },
  {
    title: "4. Candidate Terms",
    content: `As a Candidate using our platform, you agree to:

**Authentic Representation:** Provide truthful information about your background, skills, and experience. Misrepresentation may result in credential revocation and account termination.

**Professional Conduct:** Behave professionally during all MentorLink sessions and platform interactions. Harassment, discrimination, or unprofessional behavior will not be tolerated.

**Credential Integrity:** Understand that your Skill Passport represents mentor-validated observations. You may not falsify, alter, or misrepresent your credentials.

**Session Participation:** Attend scheduled mentor sessions on time and prepared. Excessive no-shows or cancellations may affect your standing.

**Feedback Acceptance:** Accept constructive feedback from mentors as part of the growth process. You may dispute observations through our formal review process.

**Credential Ownership:** You retain ownership of your Skill Passport and control over which employers can view your credentials through T3X Exchange.`,
  },
  {
    title: "5. Mentor Terms",
    content: `As a Mentor on our platform, you agree to:

**Qualification Standards:** Maintain the professional qualifications and experience represented in your mentor profile. Notify us of any changes to your professional status.

**Objective Assessment:** Provide fair, unbiased, and evidence-based observations of candidate behaviors. Personal biases or conflicts of interest must be disclosed and may require recusal.

**Confidentiality:** Maintain confidentiality of candidate information and session details. Do not share candidate data outside the platform.

**Professional Standards:** Conduct sessions professionally and respectfully. Provide constructive feedback focused on observable behaviors.

**Availability Commitment:** Maintain reasonable availability for scheduled sessions. Communicate schedule changes promptly.

**Compensation:** Mentor compensation is subject to separate agreement. Mentors are independent contractors, not employees.

**Training Requirements:** Complete all required mentor training and certification programs. Participate in ongoing quality calibration activities.`,
  },
  {
    title: "6. Employer Terms",
    content: `As an Employer using T3X Exchange, you agree to:

**Legitimate Use:** Use candidate information solely for legitimate hiring and recruitment purposes. Reselling or redistributing candidate data is prohibited.

**Non-Discrimination:** Comply with all applicable employment laws and not discriminate based on protected characteristics.

**Candidate Privacy:** Respect candidate privacy preferences and only contact candidates through approved channels.

**Accurate Postings:** Provide accurate job descriptions and company information. Misleading postings will be removed.

**Feedback Obligations:** Provide outcome feedback on hired candidates to improve platform matching (anonymized and aggregated).

**Subscription Terms:** Access to T3X Exchange requires a subscription. Fees and terms are specified in your enterprise agreement.`,
  },
  {
    title: "7. School/Institution Terms",
    content: `Educational institutions participating in Civic Access Lab agree to:

**Student Protection:** Ensure appropriate consent and safeguards for student participants, especially minors.

**Program Implementation:** Implement the program according to provided guidelines and training materials.

**Data Handling:** Handle student data in compliance with FERPA, COPPA, and applicable education privacy laws.

**Staff Training:** Ensure staff facilitating the program complete required training.

**Progress Reporting:** Provide required program outcome data for improvement and reporting purposes.`,
  },
  {
    title: "8. Intellectual Property",
    content: `**Our Content:** The Service and its original content, features, and functionality are owned by The 3rd Academy and protected by intellectual property laws. This includes our assessment frameworks, training materials, and platform technology.

**User Content:** You retain ownership of content you submit (resumes, project work, etc.). By submitting content, you grant us a license to use it for providing and improving our services.

**Credential Data:** Behavioral observations and credential data are generated collaboratively. Candidates own their Skill Passport while we retain rights to aggregated, anonymized platform data.

**Restrictions:** You may not copy, modify, distribute, or reverse engineer any part of the Service without permission.`,
  },
  {
    title: "9. Prohibited Conduct",
    content: `You agree not to:

- Violate any applicable laws or regulations
- Impersonate others or misrepresent your affiliation
- Submit false, misleading, or fraudulent information
- Harass, abuse, or harm other users
- Attempt to gain unauthorized access to the Service
- Interfere with the Service's security or functionality
- Use the Service for any illegal or unauthorized purpose
- Scrape, data mine, or automatically collect information
- Circumvent credential validation processes
- Share account credentials with others
- Use the Service to distribute malware or harmful content

Violations may result in immediate account termination and legal action.`,
  },
  {
    title: "10. Disclaimer of Warranties",
    content: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.

We do not warrant that:
- The Service will be uninterrupted or error-free
- Results obtained will be accurate or reliable
- Credentials will guarantee employment outcomes
- All employer or mentor information is accurate

Behavioral validation represents observed evidence at a point in time and does not guarantee future performance. Employers make independent hiring decisions.`,
  },
  {
    title: "11. Limitation of Liability",
    content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE 3RD ACADEMY SHALL NOT BE LIABLE FOR:

- Indirect, incidental, special, consequential, or punitive damages
- Loss of profits, data, or business opportunities
- Employment outcomes or career results
- Actions of other users, mentors, or employers
- Service interruptions or data loss

Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim.`,
  },
  {
    title: "12. Dispute Resolution",
    content: `**Informal Resolution:** Before filing a formal dispute, you agree to contact us and attempt to resolve the matter informally.

**Arbitration:** Any disputes not resolved informally shall be resolved through binding arbitration under the rules of the American Arbitration Association.

**Class Action Waiver:** You agree to resolve disputes individually and waive the right to participate in class actions.

**Governing Law:** These Terms are governed by the laws of the State of California.

**Venue:** Any litigation shall be conducted in the state or federal courts located in San Francisco County, California.`,
  },
  {
    title: "13. General Provisions",
    content: `**Entire Agreement:** These Terms constitute the entire agreement between you and The 3rd Academy regarding the Service.

**Severability:** If any provision is found unenforceable, the remaining provisions will continue in effect.

**Waiver:** Our failure to enforce any right or provision does not constitute a waiver.

**Assignment:** You may not assign these Terms without our consent. We may assign our rights freely.

**Notice:** We may provide notices through the Service, email, or other reasonable means.`,
  },
  {
    title: "14. Contact Information",
    content: `For questions about these Terms of Service, please contact us:

**Email:** legal@the3rdacademy.com

**Mail:**
The 3rd Academy
Legal Department
123 Innovation Way
San Francisco, CA 94105

For general support inquiries, please visit our [Help Center](/help) or contact support@the3rdacademy.com.`,
  },
];

const Terms = () => {
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
                <FileText className="w-4 h-4" />
                Legal
              </span>
            </motion.div>
            <motion.h1
              variants={itemVariants}
              className="text-3xl md:text-4xl font-display font-normal mb-6"
            >
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
                Terms of
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Service
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
                Welcome to The 3rd Academy. These Terms of Service govern your use of
                our platform and services. Please read them carefully before using
                our Service. By creating an account or using The 3rd Academy, you
                acknowledge that you have read, understood, and agree to be bound
                by these Terms.
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
                  <div className="text-gray-400 leading-relaxed whitespace-pre-line">
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
                Questions About Our Terms?
              </h3>
              <p className="text-gray-400 mb-4">
                Contact our legal team for any questions or concerns.
              </p>
              <a
                href="mailto:legal@the3rdacademy.com"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                legal@the3rdacademy.com
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Terms;
