export interface TimelineEntry {
  role: string;
  company: string;
  companyUrl: string | null;
  period: string;
  current: boolean;
  description: string;
}

export const timeline: TimelineEntry[] = [
  {
    role: 'Software Engineer III',
    company: 'Google',
    companyUrl: 'https://google.com',
    period: 'Nov 2025 – now',
    current: true,
    description:
      'Promoted to L4. Leading ownership of server-side telemetry for Gemini Code Assist — data quality, on-call reliability, and pipeline architecture for GenAI API surfaces.',
  },
  {
    role: 'Software Engineer II',
    company: 'Google',
    companyUrl: 'https://google.com',
    period: 'Oct 2024 – Oct 2025',
    current: false,
    description:
      'Built high-volume privacy-compliant data collection for Gemini CLI, IDE plugins, Android Studio, and Colab. Reduced PII redaction false positives ~90%, maintained distributed logging pipelines in Go.',
  },
  {
    role: 'Data Analyst Intern',
    company: 'Acciona',
    companyUrl: 'https://acciona.com',
    period: '2024',
    current: false,
    description:
      'AI chatbots with Vertex AI and DialogflowCX. Data extraction pipelines from APIs and PDFs via Document AI into BigQuery.',
  },
  {
    role: 'BS Computer Science & Mathematics',
    company: 'Universidad Autónoma de Madrid',
    companyUrl: null,
    period: '2020 – 2024',
    current: false,
    description:
      'Dual degree in CS and Mathematics — algorithms, distributed systems, linear algebra, probability, numerical methods.',
  },
];
