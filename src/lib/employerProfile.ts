/**
 * The fields the company profile form writes. `is_verified` is not one of them: the employer's page used to set it as soon as three fields were filled in, so
 * any employer could mark themselves verified. Verification is an administrator's decision (the Verify button on the admin desk) and the real employer
 * approval is the t3a_employer_application record; the form only writes what the employer typed.
 */
export interface CompanyForm {
  company_name: string;
  industry: string;
  company_size: string;
  company_website: string;
}

export function companyProfileFields(form: CompanyForm) {
  return {
    company_name: form.company_name,
    industry: form.industry,
    company_size: form.company_size,
    company_website: form.company_website,
  };
}
