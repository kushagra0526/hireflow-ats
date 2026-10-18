import Candidate from './models/Candidate.js';

const DAY = 86_400_000;
const FLOW = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];

// [name, position, stage, source, rating, years of experience, applied N days ago, skills]
const PEOPLE = [
  ['Aarav Sharma', 'Frontend Engineer', 'Interview', 'LinkedIn', 4, 3, 12, 'React, TypeScript, CSS'],
  ['Priya Nair', 'Backend Engineer', 'Offer', 'Referral', 5, 5, 25, 'Node.js, MongoDB, AWS'],
  ['Rohan Mehta', 'Data Analyst', 'Screening', 'Job Board', 3, 2, 6, 'SQL, Python, Power BI'],
  ['Ananya Iyer', 'Product Designer', 'Hired', 'Website', 5, 4, 40, 'Figma, UX Research, Prototyping'],
  ['Vikram Singh', 'DevOps Engineer', 'Applied', 'LinkedIn', 0, 6, 2, 'Docker, Kubernetes, Terraform'],
  ['Sneha Kapoor', 'Product Manager', 'Interview', 'Referral', 4, 7, 18, 'Roadmapping, Analytics, Agile'],
  ['Arjun Reddy', 'Frontend Engineer', 'Rejected', 'Job Board', 2, 1, 30, 'JavaScript, HTML, CSS'],
  ['Kavya Menon', 'Backend Engineer', 'Screening', 'LinkedIn', 3, 3, 8, 'Java, Spring Boot, PostgreSQL'],
  ['Daniel Brooks', 'Data Analyst', 'Hired', 'Referral', 4, 4, 52, 'Python, Tableau, Statistics'],
  ['Ishita Banerjee', 'Product Designer', 'Applied', 'Website', 0, 2, 1, 'Figma, Illustration, Design Systems'],
  ['Karan Malhotra', 'DevOps Engineer', 'Interview', 'Job Board', 4, 5, 15, 'AWS, CI/CD, Linux'],
  ['Meera Joshi', 'Frontend Engineer', 'Offer', 'LinkedIn', 5, 4, 28, 'React, Next.js, Testing'],
  ['Siddharth Rao', 'Backend Engineer', 'Applied', 'Job Board', 0, 1, 3, 'Python, Django, REST APIs'],
  ['Emily Chen', 'Product Manager', 'Screening', 'LinkedIn', 3, 6, 9, 'Strategy, SQL, User Interviews'],
  ['Nikhil Verma', 'Data Analyst', 'Rejected', 'Website', 2, 1, 22, 'Excel, SQL'],
  ['Tanvi Deshpande', 'Frontend Engineer', 'Hired', 'Referral', 5, 5, 45, 'React, Redux, Accessibility'],
  ['Rahul Gupta', 'DevOps Engineer', 'Screening', 'LinkedIn', 3, 3, 5, 'GCP, Docker, Monitoring'],
  ['Aisha Khan', 'Backend Engineer', 'Interview', 'Website', 4, 4, 14, 'Go, gRPC, Redis'],
  ['Varun Pillai', 'Product Designer', 'Rejected', 'Job Board', 2, 2, 35, 'Sketch, Wireframing'],
  ['Pooja Agarwal', 'Product Manager', 'Applied', 'Referral', 0, 5, 4, 'B2B SaaS, Analytics, Roadmapping'],
  ['Lucas Martin', 'Frontend Engineer', 'Screening', 'Job Board', 3, 2, 7, 'Vue, JavaScript, CSS'],
  ['Divya Krishnan', 'Data Analyst', 'Interview', 'LinkedIn', 4, 3, 16, 'Python, Pandas, Looker'],
  ['Aditya Bose', 'Backend Engineer', 'Hired', 'LinkedIn', 4, 6, 60, 'Node.js, Microservices, Kafka'],
  ['Riya Saxena', 'DevOps Engineer', 'Applied', 'Website', 0, 2, 0, 'Linux, Bash, Ansible'],
  ['Harsh Patel', 'Product Manager', 'Rejected', 'LinkedIn', 1, 3, 26, 'Agile, Jira'],
  ['Neha Choudhary', 'Product Designer', 'Interview', 'Referral', 4, 3, 11, 'Figma, Motion Design, UX Writing'],
  ['Samuel Okafor', 'Backend Engineer', 'Applied', 'Job Board', 0, 4, 1, 'C#, .NET, Azure'],
  ['Zara Ahmed', 'Frontend Engineer', 'Applied', 'LinkedIn', 0, 1, 2, 'React, Tailwind, JavaScript'],
];

const NOTES = {
  'Aarav Sharma': 'Strong portfolio. System design round scheduled for Thursday.',
  'Priya Nair': 'Offer sent, waiting on reply. Notice period 30 days.',
  'Sneha Kapoor': 'Great product sense in the case study. Needs a culture-fit chat.',
  'Arjun Reddy': 'Not enough depth in JavaScript fundamentals for this level.',
  'Meera Joshi': 'Top pick for the frontend role. Negotiating start date.',
  'Aisha Khan': 'Referred by the platform team lead.',
};

export function buildSeed(now = Date.now()) {
  return PEOPLE.map(([name, position, stage, source, rating, experience, daysAgo, skills], i) => {
    // rejected candidates drop out after Applied, Screening or Interview
    const path = stage === 'Rejected' ? [...FLOW.slice(0, 1 + (i % 3)), 'Rejected'] : FLOW.slice(0, FLOW.indexOf(stage) + 1);
    const appliedAt = now - daysAgo * DAY - (i % 9) * 3_600_000;
    const slug = name.toLowerCase().replace(/\s+/g, '.');
    return {
      name,
      email: `${slug}@example.com`,
      phone: `+91 98${String(10_000_000 + i * 2_345_671).slice(-8)}`,
      position,
      experience,
      skills: skills.split(', '),
      source,
      rating,
      resumeUrl: `https://example.com/resumes/${slug.replace('.', '-')}.pdf`,
      notes: NOTES[name] ?? '',
      stage,
      appliedAt,
      history: path.map((s, k) => ({ stage: s, at: appliedAt + ((now - appliedAt) * k) / path.length })),
    };
  });
}

export async function seedIfEmpty() {
  if (await Candidate.estimatedDocumentCount()) return;
  await Candidate.insertMany(buildSeed());
  console.log(`Seeded ${PEOPLE.length} demo candidates`);
}
