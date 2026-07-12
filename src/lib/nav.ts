export const ENV_TABS = [
  { label: "Live Map & Simulator", href: "/environmental/simulator" },
  { label: "Emission Factors", href: "/environmental/emission-factors" },
  { label: "Carbon Transactions", href: "/environmental/carbon-transactions" },
  { label: "Environmental Goals", href: "/environmental/goals" },
];

export const SOCIAL_TABS = [
  { label: "My Dashboard", href: "/social/me" },
  { label: "CSR Activities", href: "/social/csr" },
  { label: "Employee Participation", href: "/social/participation" },
  { label: "Diversity Dashboard", href: "/social/diversity" },
  { label: "Company Setup", href: "/social/onboarding" },
  { label: "Domain Tool", href: "/social/domain-tool" },
];

export const GOV_TABS = [
  { label: "Policies", href: "/governance/policies" },
  { label: "Audits", href: "/governance/audits" },
  { label: "Compliance Issues", href: "/governance/compliance" },
];

export const GAME_TABS = [
  { label: "Challenges", href: "/gamification/challenges" },
  { label: "Badges", href: "/gamification/badges" },
  { label: "Rewards", href: "/gamification/rewards" },
  { label: "Leaderboard", href: "/gamification/leaderboard" },
];

export const SETTINGS_TABS = [
  { label: "Departments", href: "/settings/departments" },
  { label: "Categories", href: "/settings/categories" },
  { label: "ESG Configuration", href: "/settings/esg" },
  { label: "Notification Settings", href: "/settings/notifications" },
];

// Enum option lists (mirror prisma/schema.prisma)
export const EMISSION_SOURCES = ["PURCHASE", "MANUFACTURING", "EXPENSE", "FLEET"] as const;
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export const CHALLENGE_STATUSES = ["DRAFT", "ACTIVE", "UNDER_REVIEW", "COMPLETED", "ARCHIVED"] as const;
export const AUDIT_STATUSES = ["SCHEDULED", "IN_PROGRESS", "UNDER_REVIEW", "COMPLETED"] as const;
export const SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const ISSUE_STATUSES = ["OPEN", "UNDER_REVIEW", "RESOLVED"] as const;
export const CATEGORY_TYPES = ["CSR_ACTIVITY", "CHALLENGE"] as const;
export const BADGE_METRICS = ["XP", "COMPLETED_CHALLENGES", "CSR_ACTIVITIES"] as const;
