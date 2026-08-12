import { PolicyDocument } from "@/components/ledger/PolicyDocument";

const sections = [
  {
    title: "1. Information We Collect",
    content: `We collect information you provide directly to us, including:

**Personal Information:** When you create an account, we collect your name, email address, phone number, and professional information such as your resume, work history, and educational background.

**Behavioral Data:** Through our MentorLink sessions and platform interactions, we collect observations about your professional behaviors, skills demonstrations, and growth progress. This data forms the basis of your Behavioral Evidence Report credential.

**Usage Information:** We automatically collect information about how you interact with our platform, including pages visited, features used, and time spent on various activities.

**Device Information:** We collect information about the device you use to access our platform, including device type, operating system, browser type, and IP address.`,
  },
  {
    title: "2. How We Use Your Information",
    content: `We use the information we collect to:

**Provide Our Services:** Process your credential applications, facilitate mentor matches, and generate your Behavioral Evidence Report and Growth Log.

**Improve Our Platform:** Analyze usage patterns to enhance our platform features, training modules, and user experience.

**Connect You With Opportunities:** Share your verified credentials with employers through T3X Exchange when you opt in to our talent marketplace.

**Communicate With You:** Send you updates about your progress, mentor session reminders, and important platform announcements.

**Ensure Security:** Detect and prevent fraud, abuse, and security threats to protect our users and platform integrity.`,
  },
  {
    title: "3. Information Sharing",
    content: `We share your information only in the following circumstances:

**With Your Consent:** We share your Behavioral Evidence Report and credential information with employers only when you explicitly authorize it through T3X Exchange.

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

**Credential Control:** You maintain ownership of your Behavioral Evidence Report and can choose which employers can view your credentials.

To exercise these rights, please contact us at privacy@the3rdacademy.com.`,
  },
  {
    title: "6. Data Retention",
    content: `We retain your information for as long as necessary to:

- Provide our services and maintain your credentials
- Comply with legal obligations
- Resolve disputes and enforce our agreements

**Credential Data:** Your Behavioral Evidence Report and Growth Log are retained for the duration of your account plus 7 years to maintain credential validity for employers.

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

**Telephone:** +1 (587) 716-3135

**Mail:**
The 3rd Academy
Privacy Team
143 Saddlecrest Gardens NE
Calgary, Alberta T4J 0C3
Canada

**Data Protection Officer:** dpo@the3rdacademy.com

For Alberta residents, you have the right to file a complaint with the Office of the Information and Privacy Commissioner of Alberta. Residents of other jurisdictions may lodge a complaint with their local data protection authority.`,
  },
];

const Privacy = () => (
  <PolicyDocument
    eyebrow="§ Privacy · Policy"
    title={
      <>
        <span className="block">Privacy</span>
        <span className="block italic display-serif-italic ink-vermilion">Policy.</span>
      </>
    }
    intro="At The 3rd Academy, we are committed to protecting your privacy and ensuring the security of your personal information. This policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services."
    lastUpdated="15 January 2026"
    sections={sections}
    contact="privacy@the3rdacademy.com"
  />
);

export default Privacy;
