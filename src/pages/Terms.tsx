import { PolicyDocument } from "@/components/ledger/PolicyDocument";

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

**Behavioral Evidence Report:** A behavioral credential earned through mentor-validated observations of workplace readiness competencies.

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

**Credential Integrity:** Understand that your Behavioral Evidence Report represents mentor-validated observations. You may not falsify, alter, or misrepresent your credentials.

**Session Participation:** Attend scheduled mentor sessions on time and prepared. Excessive no-shows or cancellations may affect your standing.

**Feedback Acceptance:** Accept constructive feedback from mentors as part of the growth process. You may dispute observations through our formal review process.

**Credential Ownership:** You retain ownership of your Behavioral Evidence Report and control over which employers can view your credentials through T3X Exchange.`,
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

**Credential Data:** Behavioral observations and credential data are generated collaboratively. Candidates own their Behavioral Evidence Report while we retain rights to aggregated, anonymized platform data.

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

**Arbitration:** Any disputes not resolved informally shall be resolved through binding arbitration under the ADR Institute of Canada Arbitration Rules.

**Class Action Waiver:** You agree to resolve disputes individually and waive the right to participate in class actions, to the extent permitted by applicable law.

**Governing Law:** These Terms are governed by the laws of the Province of Alberta and the federal laws of Canada applicable therein.

**Venue:** Any litigation shall be conducted in the courts of the Province of Alberta, located in Calgary.`,
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

**Telephone:** +1 (587) 716-3135

**Mail:**
The 3rd Academy
Legal Department
143 Saddlecrest Gardens NE
Calgary, Alberta T4J 0C3
Canada

For general support inquiries, please visit our [Help Center](/help) or contact support@the3rdacademy.com.`,
  },
];

const Terms = () => (
  <PolicyDocument
    eyebrow="§ Terms · Service"
    title={
      <>
        <span className="block">Terms of</span>
        <span className="block italic display-serif-italic ink-vermilion">Service.</span>
      </>
    }
    intro="Welcome to The 3rd Academy. These terms govern your use of our platform and services. By creating an account or using The 3rd Academy, you acknowledge that you have read, understood, and agree to be bound by these Terms."
    lastUpdated="15 January 2026"
    sections={sections}
    contact="legal@the3rdacademy.com"
  />
);

export default Terms;
