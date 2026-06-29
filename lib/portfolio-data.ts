export const WHOAMI = {
  tagline: "full-stack engineer · cloud & infra · builder",
  bio: "I build full-stack web apps, cloud infrastructure, and IoT systems — from quote wizards and admin dashboards to Terraform pipelines and self-hosted homelabs. Currently finishing my capstone on industrial equipment monitoring. Poke around, and play the game while you're here.",
};

export const STATS = [
  { val: "12", sub: "+", label: "projects shipped" },
  { val: "99", sub: "%", label: "uptime (weather app)" },
  { val: "150", sub: "", label: "concurrent users", accent: true },
] as const;

export const STAT_CHART_LABEL = "project activity";
export const STAT_CHART_HEIGHTS = [55, 68, 72, 85, 100, 78, 90, 82];

export type Project = {
  name: string;
  desc: string;
  tags: string[];
  category?: string;
};

export const PROJECTS: Project[] = [
  {
    name: "Industrial Equipment Monitoring",
    desc: "Capstone IoT platform with RBAC, real-time health scoring, and anomaly alerts.",
    tags: ["Next.js", "Supabase", "PostgreSQL"],
    category: "Capstone",
  },
  {
    name: "TerraForm",
    desc: "Geospatial solar-site selection for the GTA using Fuzzy TOPSIS and Mapbox.",
    tags: ["PostGIS", "Neo4j", "Mapbox"],
    category: "Data / GIS",
  },
  {
    name: "Custom Blinds Web App",
    desc: "Interactive quote wizard, inventory CRUD, customer portals, and admin dashboards.",
    tags: ["React", "Supabase", "Tailwind"],
    category: "Web",
  },
  {
    name: "LLM Fine-Tuning on Trainium",
    desc: "Fine-tuned Qwen3-1.7B on AWS Trainium with Neuron SDK training pipelines.",
    tags: ["AWS", "Hugging Face", "ML"],
    category: "Cloud / ML",
  },
  {
    name: "Weather Monitoring App",
    desc: "Containerized Django app on K8s across GCP, AWS, and DigitalOcean.",
    tags: ["Django", "Docker", "K8s"],
    category: "Cloud",
  },
  {
    name: "Industrial Log Reader",
    desc: "Shift-based digital logging for industrial use with binary-tree workflow logic.",
    tags: ["Node.js"],
    category: "Systems",
  },
  {
    name: "AWS Deployment Workshop",
    desc: "Curriculum for rapid web deployment with Amplify, Next.js, and team roles.",
    tags: ["AWS Amplify", "Next.js"],
    category: "Education",
  },
  {
    name: "Content Moderation System",
    desc: "GPT-based profanity filtering and React admin review for Let's Get Together.",
    tags: ["React", "GPT", "Node.js"],
    category: "Volunteer",
  },
  {
    name: "Homelab & Self-Hosting",
    desc: "Immich on preyas.ca via Cloudflare Tunnel, plus Plex, Tailscale, and Docker.",
    tags: ["Docker", "Prometheus", "Grafana"],
    category: "Infra",
  },
  {
    name: "CI/CD & Automation",
    desc: "Terraform/Azure pipelines and Ansible server provisioning.",
    tags: ["Terraform", "Azure", "Ansible"],
    category: "Infra",
  },
  {
    name: "OS Virtualization Lab",
    desc: "KVM/QEMU on WSL2 with cross-platform setup automation.",
    tags: ["KVM", "QEMU", "Bash"],
    category: "Systems",
  },
  {
    name: "Linux Fingerprint Auth",
    desc: "Custom libfprint builds for Egis sensors with PAM and SDCP debugging.",
    tags: ["Linux", "PAM", "libfprint"],
    category: "Systems",
  },
];

export const WRITING = [
  {
    date: "2026·04",
    title: "Industrial Equipment Monitoring — Capstone Report",
    read: "Full-stack IoT · academic",
  },
  {
    date: "2026·04",
    title: "LLM Fine-Tuning on AWS Trainium",
    read: "Qwen3-1.7B · Neuron SDK",
  },
  {
    date: "2025·09",
    title: "TerraForm — Urban Sustainability Platform",
    read: "Fuzzy TOPSIS · solar GIS",
  },
  {
    date: "2024·10",
    title: "Cross-Platform OS Emulation & Virtualization",
    read: "KVM/QEMU · WSL2",
  },
] as const;

export const EXPERIENCE = [
  {
    role: "Volunteer Software Developer",
    org: "Let's Get Together",
    when: "2025 — now",
    detail: "GPT content moderation system & zero-loss data migration",
  },
  {
    role: "Capstone — IoT Monitoring Platform",
    org: "Academic",
    when: "Jan — Apr 2026",
    detail: "Full-stack equipment health scoring with RBAC & alerts",
  },
] as const;

export const SKILLS = [
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Supabase",
  "PostgreSQL",
  "AWS",
  "Azure",
  "Terraform",
  "Docker",
  "Kubernetes",
  "Prometheus",
  "Grafana",
] as const;
