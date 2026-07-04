// Optimora AI Automation OS — static data layer (13 industry packs)
// All items clearly marked with deployment status. No fake integrations.
// LinkedIn is "official integration required" — no scraping. No medical diagnosis. No legal advice.

export type DeployStatus = "ready" | "demo" | "requires_integration" | "custom_setup";
export type ApprovalRequired = boolean;

// ── Industry Packs ────────────────────────────────────────────────────────────

export interface IndustryPack {
  key: string;
  name: string;
  icon: string;
  color: string;
  headline: string;
  description: string;
  forWho: string;
  workflows: string[];
  agents: string[];
  hoursSaved: number;
  status: DeployStatus;
  dashboardHref: string;
  roiEstimate: string;
  sampleOutput: string;
  integrations: string[];
  businessOutcome: string;
}

export const INDUSTRY_PACKS: IndustryPack[] = [
  {
    key: "agency",
    name: "Agency",
    icon: "Building2",
    color: "indigo",
    headline: "Turn your agency into an AI automation powerhouse",
    description: "Sell AI agent workflows to clients under your own brand. Automate lead generation, proposals, reporting, and client delivery at scale.",
    forWho: "Marketing agencies, web agencies, automation consultants, white-label partners",
    workflows: [
      "Lead Generation Workflow", "Prospect Research Workflow", "Proposal Follow-up Workflow",
      "Client Onboarding Workflow", "Client Reporting Workflow", "Campaign Performance Summary",
      "Meeting Notes to Action Items", "White-label Workspace Setup",
      "Lost Client Reactivation", "Monthly Retainer Value Report",
    ],
    agents: [
      "Prospect Research Agent", "Outreach Agent", "Proposal Agent",
      "Client Onboarding Agent", "Report Agent", "Account Manager Agent",
      "Campaign Analyst Agent", "Follow-up Agent", "White-label Setup Agent",
    ],
    hoursSaved: 42,
    status: "demo",
    dashboardHref: "/dashboard/industry/agency",
    roiEstimate: "Save 42+ hours/week across client ops. Generate ₹3–8L in new recurring revenue per agency.",
    sampleOutput: "AI agency team generated 127 prospects, prepared 14 proposal follow-ups, created 8 client reports, and saved 42 hours this week.",
    integrations: ["CRM (HubSpot / Zoho)", "Google Sheets", "Email", "Webhook"],
    businessOutcome: "Scale client delivery without scaling headcount. Sell automation as a service.",
  },
  {
    key: "real-estate",
    name: "Real Estate",
    icon: "Home",
    color: "emerald",
    headline: "Never lose a property lead again",
    description: "Qualify, follow up, schedule site visits, and revive cold leads — all without manual effort. Your AI team works every lead 24/7.",
    forWho: "Brokers, builders, property consultants, real estate agencies, developers",
    workflows: [
      "New Property Lead Response", "Buyer Qualification Workflow", "Property Matching Workflow",
      "Site Visit Scheduling", "Broker Follow-up Workflow", "Lost Lead Revival",
      "Rental Inquiry Management", "Builder Project Inquiry", "Daily Sales Pipeline Report",
      "High-intent Lead Alert",
    ],
    agents: [
      "Lead Capture Agent", "Buyer Qualification Agent", "Property Match Agent",
      "Visit Scheduler Agent", "Follow-up Agent", "CRM Update Agent",
      "Lost Lead Revival Agent", "Sales Report Agent",
    ],
    hoursSaved: 35,
    status: "demo",
    dashboardHref: "/dashboard/industry/real-estate",
    roiEstimate: "Recover 9+ lost leads/week. Book 11 site visits on autopilot. Save 35 broker hours.",
    sampleOutput: "Optimora followed up with 86 property leads, booked 11 site visits, revived 9 cold leads, and identified 23 high-intent buyers.",
    integrations: ["CRM", "WhatsApp Business", "Google Calendar", "Email"],
    businessOutcome: "Maximise revenue from every lead. Book more visits. Convert cold to hot.",
  },
  {
    key: "hr",
    name: "HR / Recruitment",
    icon: "Users",
    color: "violet",
    headline: "Hire faster with an AI recruitment team",
    description: "Screen resumes, rank candidates, follow up, and schedule interviews — all automated. LinkedIn is manual approval only; no scraping.",
    forWho: "HR teams, recruiters, staffing agencies, companies hiring regularly",
    workflows: [
      "Job Description Creation", "Application Collection", "Resume Parsing",
      "Candidate Scoring", "Shortlist Approval", "Interview Scheduling",
      "Candidate Follow-up", "Rejection Email", "Hiring Funnel Report", "Recruiter Daily Summary",
    ],
    agents: [
      "JD Agent", "Resume Parser Agent", "Candidate Screening Agent",
      "Shortlist Agent", "Interview Scheduler Agent", "Candidate Communication Agent",
      "Hiring Report Agent",
    ],
    hoursSaved: 30,
    status: "demo",
    dashboardHref: "/dashboard/industry/hr",
    roiEstimate: "Cut time-to-shortlist by 70%. Save ₹1.5–3L/month in recruiter hours.",
    sampleOutput: "AI HR team screened 184 resumes, shortlisted 22 candidates, scheduled 14 interviews, and sent 41 status updates this week.",
    integrations: ["ATS (generic CSV upload)", "Google Calendar", "Email", "LinkedIn (official integration required — no scraping)"],
    businessOutcome: "Fill roles faster. Reduce recruiter burnout. Standardise candidate experience.",
  },
  {
    key: "education",
    name: "Education",
    icon: "GraduationCap",
    color: "amber",
    headline: "Convert more student inquiries without hiring more counselors",
    description: "Handle every inquiry, book demos, send fee reminders, onboard students, and recover drop-offs — 24/7 without fatigue.",
    forWho: "Coaching classes, colleges, edtech companies, course sellers, admission teams",
    workflows: [
      "Student Inquiry Follow-up", "Course Recommendation", "Demo Class Booking",
      "Admission Counseling", "Fee Reminder", "Student Onboarding",
      "Parent Follow-up", "Lead Nurturing", "Drop-off Student Recovery", "Daily Admission Report",
    ],
    agents: [
      "Inquiry Response Agent", "Course Advisor Agent", "Demo Scheduler Agent",
      "Admission Follow-up Agent", "Fee Reminder Agent", "Student Onboarding Agent",
      "Parent Communication Agent", "Admission Report Agent",
    ],
    hoursSaved: 25,
    status: "demo",
    dashboardHref: "/dashboard/industry/education",
    roiEstimate: "Handle 5x more inquiries. Recover 18 drop-offs/week. Save 25 counselor hours.",
    sampleOutput: "Optimora handled 214 student inquiries, booked 37 demo sessions, sent 91 follow-ups, and recovered 18 dropped leads.",
    integrations: ["WhatsApp Business", "Email", "Google Sheets", "CRM"],
    businessOutcome: "Maximise admissions revenue. Never let an inquiry go cold. Scale counseling ops.",
  },
  {
    key: "ecommerce",
    name: "Ecommerce",
    icon: "ShoppingCart",
    color: "orange",
    headline: "Automate COD, carts, support, and reviews — at scale",
    description: "Confirm CODs, recover abandoned carts, handle returns, request reviews, and resolve support — without a large ops team.",
    forWho: "Shopify stores, D2C brands, marketplaces, COD sellers, online retailers",
    workflows: [
      "COD Confirmation", "Abandoned Cart Recovery", "Order Status Response",
      "Return / Refund Handling", "Review Collection", "Customer Support FAQ",
      "Inventory Alert", "Delivery Delay Communication",
      "Repeat Purchase Follow-up", "Daily Store Operations Report",
    ],
    agents: [
      "COD Confirmation Agent", "Cart Recovery Agent", "Order Support Agent",
      "Return Assistant Agent", "Review Request Agent", "Inventory Alert Agent",
      "Customer Support Agent", "Store Report Agent",
    ],
    hoursSaved: 45,
    status: "requires_integration",
    dashboardHref: "/dashboard/industry/ecommerce",
    roiEstimate: "Recover ₹48,000+/week in abandoned carts. Confirm 73+ COD orders/day. Save 45 support hours.",
    sampleOutput: "Optimora confirmed 73 COD orders, recovered ₹48,000 in abandoned carts, resolved 112 support queries, and requested 39 reviews.",
    integrations: ["Shopify", "WhatsApp Business", "Email", "SMS gateway"],
    businessOutcome: "Reduce cancellations. Increase repeat purchases. Reduce support cost per order.",
  },
  {
    key: "clinic",
    name: "Clinics / Healthcare",
    icon: "Stethoscope",
    color: "rose",
    headline: "Run your clinic with an AI front desk team",
    description: "Book appointments, send reminders, recover missed visits, and handle patient FAQs — all without adding admin staff. No medical diagnosis; clinical review required for health outputs.",
    forWho: "Clinics, dentists, doctors, diagnostic centers, wellness centers, small hospitals",
    workflows: [
      "Appointment Booking", "Patient Reminder", "Missed Appointment Recovery",
      "Follow-up Visit Reminder", "Lab Report Reminder", "Doctor Schedule Coordination",
      "Review Request", "Patient FAQ", "Daily Clinic Report", "Prescription Follow-up Reminder",
    ],
    agents: [
      "Appointment Agent", "Patient Reminder Agent", "Front Desk Agent",
      "Follow-up Care Agent", "Report Reminder Agent", "Doctor Schedule Agent",
      "Review Agent", "Clinic Report Agent",
    ],
    hoursSaved: 28,
    status: "demo",
    dashboardHref: "/dashboard/industry/clinic",
    roiEstimate: "Recover 15+ missed appointments/week. Save 28 front-desk hours. Reduce no-shows by 40%.",
    sampleOutput: "Optimora booked 48 appointments, sent 91 patient reminders, recovered 15 missed visits, and handled 37 patient FAQs today.",
    integrations: ["WhatsApp Business", "Google Calendar", "Email", "SMS"],
    businessOutcome: "Fill appointment slots. Reduce no-shows. Free front-desk staff for complex tasks.",
  },
  {
    key: "logistics",
    name: "Logistics / Warehouse",
    icon: "Truck",
    color: "sky",
    headline: "Automate tracking, exceptions, docs, and reporting",
    description: "Track shipments, flag delivery exceptions, verify documents, coordinate vendors, and generate warehouse reports — without manual chasing.",
    forWho: "Warehouses, logistics firms, transporters, 3PL companies, inventory-heavy businesses",
    workflows: [
      "Shipment Status Update", "Delivery Exception Alert", "Inventory Reorder Alert",
      "Vendor Coordination", "Document Verification", "Pickup Scheduling",
      "Warehouse Daily Report", "Stock Movement Summary",
      "Return Shipment Handling", "SLA Breach Alert",
    ],
    agents: [
      "Shipment Tracking Agent", "Exception Alert Agent", "Inventory Agent",
      "Vendor Coordination Agent", "Document Verification Agent", "Pickup Scheduler Agent",
      "Warehouse Report Agent", "SLA Monitor Agent",
    ],
    hoursSaved: 38,
    status: "requires_integration",
    dashboardHref: "/dashboard/industry/logistics",
    roiEstimate: "Flag 18 exceptions/day before SLA breach. Save 38 ops hours/week. Cut delayed deliveries by 25%.",
    sampleOutput: "Optimora tracked 312 shipments, flagged 18 delivery exceptions, verified 64 documents, and generated the daily warehouse report.",
    integrations: ["Logistics ERP (Webhook)", "Google Sheets", "Email", "SMS"],
    businessOutcome: "Reduce delivery failures. Prevent SLA breaches. Run ops without expanding headcount.",
  },
  {
    key: "saas",
    name: "SaaS / B2B",
    icon: "Layers",
    color: "teal",
    headline: "Qualify leads, book demos, reduce churn — on autopilot",
    description: "From lead qualification to demo scheduling to churn risk alerts — run your entire sales and customer success pipeline with AI agents.",
    forWho: "SaaS companies, B2B services, software companies, subscription businesses",
    workflows: [
      "Lead Qualification", "Demo Scheduling", "Trial User Follow-up",
      "Onboarding Completion", "Churn Risk Alert", "Support Ticket Summary",
      "Customer Success Check-in", "Sales Pipeline Update",
      "Renewal Reminder", "Product Feedback Summary",
    ],
    agents: [
      "Lead Qualification Agent", "Demo Scheduler Agent", "Trial Nurture Agent",
      "Onboarding Agent", "Churn Risk Agent", "Support Summary Agent",
      "Customer Success Agent", "Renewal Agent", "Feedback Analyst Agent",
    ],
    hoursSaved: 50,
    status: "demo",
    dashboardHref: "/dashboard/industry/saas",
    roiEstimate: "Increase trial-to-paid conversion by 30%. Flag churn 14 days early. Save 50 CS hours/week.",
    sampleOutput: "Optimora followed up with 54 trial users, scheduled 9 demos, flagged 6 churn risks, and updated ₹7.4L in pipeline opportunities.",
    integrations: ["CRM (HubSpot / Zoho)", "Email", "Webhook", "Google Sheets"],
    businessOutcome: "Close more trials. Prevent churn. Scale CS without headcount.",
  },
  {
    key: "finance",
    name: "Finance / Accounting",
    icon: "CreditCard",
    color: "slate",
    headline: "Automate invoice reminders, document collection, and reporting",
    description: "Follow up on invoices, collect compliance documents, send tax reminders, and generate client reports. All outputs marked for accountant review.",
    forWho: "Accountants, CA firms, finance teams, tax consultants, small business finance",
    workflows: [
      "Invoice Payment Reminder", "Client Document Collection", "Monthly Expense Summary",
      "GST / Tax Document Reminder", "Payment Follow-up", "Finance Report Generation",
      "Vendor Bill Tracking", "Outstanding Receivables Alert",
      "Client Compliance Checklist", "Monthly Client Summary",
    ],
    agents: [
      "Invoice Reminder Agent", "Document Collection Agent", "Expense Summary Agent",
      "Compliance Reminder Agent", "Payment Follow-up Agent", "Finance Report Agent",
      "Vendor Bill Agent", "Receivables Agent",
    ],
    hoursSaved: 32,
    status: "demo",
    dashboardHref: "/dashboard/industry/finance",
    roiEstimate: "Follow up on 22+ overdue invoices/week. Save 32 finance hours. Collect ₹2–5L in delayed payments.",
    sampleOutput: "Optimora sent 22 invoice reminders, collected 14 compliance documents, flagged 8 overdue receivables, and generated 6 client reports.",
    integrations: ["Email", "WhatsApp Business", "Google Sheets", "Tally (Webhook)"],
    businessOutcome: "Reduce days sales outstanding. Collect documents on time. Free CA/accountant for advisory.",
  },
  {
    key: "legal",
    name: "Legal / Professional Services",
    icon: "Briefcase",
    color: "gray",
    headline: "Automate client intake, follow-ups, and professional reporting",
    description: "Handle client intake, collect documents, send deadline reminders, summarise meetings, and draft reports. All outputs marked for professional review.",
    forWho: "Lawyers, consultants, architects, service firms, professional practices",
    workflows: [
      "Client Intake", "Document Collection", "Consultation Scheduling",
      "Case / Project Follow-up", "Meeting Summary", "Client Update",
      "Deadline Reminder", "Proposal / Engagement Follow-up",
      "Professional Report Drafting", "Daily Task Summary",
    ],
    agents: [
      "Client Intake Agent", "Document Collection Agent", "Scheduler Agent",
      "Case Follow-up Agent", "Meeting Summary Agent", "Client Update Agent",
      "Deadline Reminder Agent", "Report Drafting Agent",
    ],
    hoursSaved: 20,
    status: "demo",
    dashboardHref: "/dashboard/industry/legal",
    roiEstimate: "Save 20 professional hours/week. Never miss a client deadline. Reduce admin time by 60%.",
    sampleOutput: "Optimora onboarded 6 new clients, collected 19 documents, sent 11 deadline reminders, and generated 4 draft reports for review.",
    integrations: ["Email", "Google Calendar", "Google Sheets", "Webhook"],
    businessOutcome: "Impress clients with fast turnaround. Reduce admin burden. Scale professional practice.",
  },
  {
    key: "restaurant",
    name: "Restaurants / Hospitality",
    icon: "UtensilsCrossed",
    color: "rose",
    headline: "Automate reservations, reviews, complaints, and daily ops",
    description: "Handle reservations, collect feedback, request reviews, escalate complaints, run daily reports, coordinate vendors, and run repeat-customer promotions.",
    forWho: "Restaurants, cafes, hotels, cloud kitchens, hospitality businesses",
    workflows: [
      "Reservation Handling", "Customer Feedback", "Review Request",
      "Complaint Escalation", "Daily Sales Summary", "Inventory Reminder",
      "Event Booking Follow-up", "Repeat Customer Promotion",
      "Staff Task Reminder", "Vendor Coordination",
    ],
    agents: [
      "Reservation Agent", "Feedback Agent", "Review Agent",
      "Complaint Escalation Agent", "Sales Summary Agent", "Inventory Reminder Agent",
      "Event Booking Agent", "Vendor Coordination Agent",
    ],
    hoursSaved: 22,
    status: "demo",
    dashboardHref: "/dashboard/industry/restaurant",
    roiEstimate: "Handle 50+ reservations/day. Collect 3x more reviews. Save 22 manager hours/week.",
    sampleOutput: "Optimora handled 53 reservations, requested 38 reviews, escalated 4 complaints, and generated the daily sales report.",
    integrations: ["WhatsApp Business", "Email", "Google Sheets", "SMS"],
    businessOutcome: "Fill seats. Protect reputation. Reduce manager overhead on daily ops.",
  },
  {
    key: "manufacturing",
    name: "Manufacturing",
    icon: "Factory",
    color: "zinc",
    headline: "Automate production reporting, alerts, and vendor ops",
    description: "Generate production reports, flag maintenance issues, alert on inventory reorders, coordinate vendors, and track KPIs — automatically.",
    forWho: "Factories, production units, industrial businesses, operations-heavy companies",
    workflows: [
      "Daily Production Report", "Maintenance Alert", "Raw Material Reorder Alert",
      "Vendor Follow-up", "Quality Issue Escalation", "Dispatch Coordination",
      "Shift Summary", "Purchase Request", "Machine Downtime Report", "Operations KPI Summary",
    ],
    agents: [
      "Production Report Agent", "Maintenance Alert Agent", "Inventory Agent",
      "Vendor Follow-up Agent", "Quality Escalation Agent", "Dispatch Coordination Agent",
      "Shift Summary Agent", "KPI Report Agent",
    ],
    hoursSaved: 30,
    status: "custom_setup",
    dashboardHref: "/dashboard/industry/manufacturing",
    roiEstimate: "Prevent 5+ unplanned downtimes/month. Save 30 ops hours/week. Cut manual reporting by 80%.",
    sampleOutput: "Optimora generated the daily production report, flagged 3 maintenance alerts, raised 2 reorder requests, and summarised 2 shifts.",
    integrations: ["ERP Webhook", "Google Sheets", "Email", "SMS"],
    businessOutcome: "Run operations with fewer errors. Surface exceptions early. Reduce downtime losses.",
  },
  {
    key: "local-services",
    name: "Local Services",
    icon: "MapPin",
    color: "pink",
    headline: "Automate bookings, reminders, reviews, and reactivation",
    description: "Handle bookings, send reminders, recover missed appointments, request reviews, send payment reminders, and run repeat-customer promotions.",
    forWho: "Salons, repair services, gyms, cleaning services, consultants, home service providers",
    workflows: [
      "Appointment Booking", "Customer Reminder", "Missed Booking Recovery",
      "Review Request", "Payment Reminder", "Repeat Customer Follow-up",
      "Service Feedback", "Daily Booking Summary",
      "Lead Inquiry Response", "Offer Broadcast Approval",
    ],
    agents: [
      "Booking Agent", "Reminder Agent", "Recovery Agent",
      "Review Agent", "Payment Reminder Agent", "Customer Reactivation Agent",
      "Feedback Agent", "Local Business Report Agent",
    ],
    hoursSaved: 18,
    status: "demo",
    dashboardHref: "/dashboard/industry/local-services",
    roiEstimate: "Recover 8+ missed bookings/week. Get 5x more reviews. Save 18 owner hours.",
    sampleOutput: "Optimora handled 67 bookings, sent 84 reminders, recovered 8 missed slots, and requested 31 reviews today.",
    integrations: ["WhatsApp Business", "SMS", "Email", "Google Sheets"],
    businessOutcome: "Fill the calendar. Protect your Google rating. Keep customers coming back.",
  },
];

// ── Agent Library ─────────────────────────────────────────────────────────────

export interface AgentDef {
  key: string;
  name: string;
  icon: string;
  color: string;
  tagline: string;
  what: string;
  inputs: string[];
  outputs: string[];
  workflows: string[];
  industries: string[];
  approvalRequired: boolean;
  integrationRequired: boolean;
  integrations: string[];
  status: DeployStatus;
}

export const AGENT_LIBRARY: AgentDef[] = [
  {
    key: "lead-capture",
    name: "Lead Capture Agent",
    icon: "Target",
    color: "indigo",
    tagline: "Captures and qualifies incoming leads 24/7",
    what: "Monitors configured channels for new leads, extracts contact details, qualifies based on criteria, and routes to the right workflow.",
    inputs: ["Form submission", "WhatsApp message", "Email inquiry", "Website chat"],
    outputs: ["Qualified lead record", "CRM entry", "Routing decision", "Team notification"],
    workflows: ["Lead Generation Workflow", "New Property Lead Response", "Student Inquiry Follow-up"],
    industries: ["Agency", "Real Estate", "Education", "SaaS / B2B", "Local Services"],
    approvalRequired: false,
    integrationRequired: true,
    integrations: ["CRM", "WhatsApp Business", "Website form"],
    status: "requires_integration",
  },
  {
    key: "outreach",
    name: "Outreach Agent",
    icon: "Send",
    color: "violet",
    tagline: "Sends personalised outreach at scale",
    what: "Composes and sends personalised outreach via email, WhatsApp, or SMS based on lead profile and campaign parameters. All sends require approval in sensitive contexts.",
    inputs: ["Lead list", "Campaign brief", "Message templates", "Approval flag"],
    outputs: ["Sent messages", "Delivery receipts", "Reply detection", "CRM update"],
    workflows: ["Lead Generation Workflow", "Lost Lead Revival", "Lost Client Reactivation"],
    industries: ["Agency", "Real Estate", "SaaS / B2B", "Education"],
    approvalRequired: true,
    integrationRequired: true,
    integrations: ["Email provider", "WhatsApp Business", "SMS gateway"],
    status: "requires_integration",
  },
  {
    key: "followup",
    name: "Follow-up Agent",
    icon: "RefreshCw",
    color: "emerald",
    tagline: "Follows up until you get a response",
    what: "Sends timed follow-up sequences, tracks replies, and escalates or stops based on response status. Works across sales, HR, education, and finance.",
    inputs: ["Contact list", "Follow-up cadence", "Stop conditions", "Channel config"],
    outputs: ["Follow-up messages sent", "Replies logged", "Escalations triggered", "Status updated in CRM"],
    workflows: ["Broker Follow-up Workflow", "Candidate Follow-up", "Admission Counseling", "Payment Follow-up"],
    industries: ["Agency", "Real Estate", "HR", "Education", "Finance", "SaaS / B2B"],
    approvalRequired: false,
    integrationRequired: true,
    integrations: ["Email provider", "WhatsApp Business"],
    status: "demo",
  },
  {
    key: "crm-update",
    name: "CRM Update Agent",
    icon: "Database",
    color: "sky",
    tagline: "Keeps your CRM accurate without manual entry",
    what: "Reads outputs from other agents and writes structured data back to your CRM — no manual entry, no stale pipeline.",
    inputs: ["Agent outputs", "Lead records", "Activity logs"],
    outputs: ["CRM entries", "Stage updates", "Contact notes", "Field updates"],
    workflows: ["Daily Sales Pipeline Report", "Sales Pipeline Update", "Client Onboarding Workflow"],
    industries: ["Agency", "Real Estate", "SaaS / B2B", "Education"],
    approvalRequired: false,
    integrationRequired: true,
    integrations: ["HubSpot", "Zoho CRM", "CSV export"],
    status: "requires_integration",
  },
  {
    key: "scheduling",
    name: "Scheduling Agent",
    icon: "CalendarCheck",
    color: "teal",
    tagline: "Books meetings, visits, and appointments automatically",
    what: "Checks calendar availability, proposes slots, confirms bookings, and sends calendar invites. Works for demos, site visits, interviews, and appointments.",
    inputs: ["Calendar availability", "Contact details", "Booking preferences"],
    outputs: ["Confirmed booking", "Calendar invite", "Reminder sequence", "No-show follow-up"],
    workflows: ["Site Visit Scheduling", "Interview Scheduling", "Demo Class Booking", "Appointment Booking"],
    industries: ["Real Estate", "HR", "Education", "Clinics", "SaaS / B2B", "Local Services"],
    approvalRequired: false,
    integrationRequired: true,
    integrations: ["Google Calendar", "Calendly"],
    status: "requires_integration",
  },
  {
    key: "report",
    name: "Report Agent",
    icon: "BarChart2",
    color: "amber",
    tagline: "Generates structured reports without manual effort",
    what: "Pulls data from activity logs, integrations, and workflow outputs to generate daily, weekly, or monthly reports for clients, managers, or business owners.",
    inputs: ["Activity logs", "Integration data", "Date range"],
    outputs: ["Formatted report", "PDF or doc", "Email delivery", "Dashboard update"],
    workflows: ["Daily Sales Pipeline Report", "Client Reporting Workflow", "Hiring Funnel Report", "Daily Admission Report"],
    industries: ["Agency", "Real Estate", "HR", "Education", "Logistics", "Manufacturing"],
    approvalRequired: false,
    integrationRequired: false,
    integrations: ["Google Sheets", "Email"],
    status: "demo",
  },
  {
    key: "resume-parser",
    name: "Resume Parser Agent",
    icon: "FileSearch",
    color: "violet",
    tagline: "Extracts, scores, and ranks candidates from CVs",
    what: "Parses uploaded CVs or application forms, extracts structured fields, scores candidates against JD criteria, and outputs a ranked shortlist.",
    inputs: ["CV files (PDF / DOCX)", "Job description", "Scoring criteria"],
    outputs: ["Parsed candidate record", "Score", "Rank", "Shortlist recommendation"],
    workflows: ["Resume Parsing", "Candidate Scoring", "Shortlist Approval"],
    industries: ["HR / Recruitment"],
    approvalRequired: true,
    integrationRequired: false,
    integrations: ["ATS (CSV upload)"],
    status: "demo",
  },
  {
    key: "support",
    name: "Customer Support Agent",
    icon: "MessageCircle",
    color: "rose",
    tagline: "Handles common customer queries without a human",
    what: "Answers FAQs, routes complex queries to a human, tracks query status, and logs all interactions. Works across ecommerce, clinics, SaaS, and local services.",
    inputs: ["Customer message", "FAQ knowledge base", "Escalation rules"],
    outputs: ["Response message", "Ticket record", "Escalation trigger", "Resolution status"],
    workflows: ["Customer Support FAQ", "Order Status Response", "Patient FAQ", "Support Ticket Summary"],
    industries: ["Ecommerce", "Clinics", "SaaS / B2B", "Local Services"],
    approvalRequired: false,
    integrationRequired: true,
    integrations: ["WhatsApp Business", "Email", "Helpdesk tool"],
    status: "requires_integration",
  },
  {
    key: "invoice-reminder",
    name: "Invoice Reminder Agent",
    icon: "CreditCard",
    color: "slate",
    tagline: "Chases overdue payments so you don't have to",
    what: "Sends structured payment reminder sequences, tracks payment status, escalates overdue accounts, and updates receivables records. Finance / CA outputs marked for review.",
    inputs: ["Invoice list", "Due dates", "Client contact details", "Reminder cadence"],
    outputs: ["Reminder messages sent", "Payment status updated", "Overdue escalations", "Receivables summary"],
    workflows: ["Invoice Payment Reminder", "Outstanding Receivables Alert", "Payment Reminder"],
    industries: ["Finance / Accounting", "Local Services", "Legal", "Ecommerce"],
    approvalRequired: false,
    integrationRequired: true,
    integrations: ["Email", "WhatsApp Business", "Tally Webhook"],
    status: "demo",
  },
  {
    key: "document-collection",
    name: "Document Collection Agent",
    icon: "ClipboardList",
    color: "orange",
    tagline: "Collects missing documents without manual follow-ups",
    what: "Sends reminders to clients or candidates to upload specific documents, tracks submission status, and escalates outstanding items.",
    inputs: ["Checklist of required documents", "Contact list", "Deadline"],
    outputs: ["Reminder messages", "Submission tracker", "Escalation alerts", "Completion confirmation"],
    workflows: ["Client Document Collection", "Document Collection", "Shortlist Approval"],
    industries: ["Finance / Accounting", "Legal", "HR / Recruitment", "Clinics"],
    approvalRequired: false,
    integrationRequired: false,
    integrations: ["Email", "WhatsApp Business", "Google Sheets"],
    status: "demo",
  },
  {
    key: "inventory-alert",
    name: "Inventory Alert Agent",
    icon: "ShoppingCart",
    color: "pink",
    tagline: "Flags stock risks before they become outages",
    what: "Monitors inventory levels against reorder thresholds, sends alerts, raises purchase requests, and coordinates vendor follow-ups.",
    inputs: ["Stock levels", "Reorder thresholds", "Vendor contacts"],
    outputs: ["Alert message", "Purchase request", "Vendor follow-up", "Inventory log entry"],
    workflows: ["Inventory Alert", "Raw Material Reorder Alert", "Inventory Reminder"],
    industries: ["Ecommerce", "Manufacturing", "Logistics", "Restaurants"],
    approvalRequired: true,
    integrationRequired: false,
    integrations: ["Google Sheets", "ERP Webhook", "Email"],
    status: "demo",
  },
  {
    key: "churn-risk",
    name: "Churn Risk Agent",
    icon: "TrendingDown",
    color: "rose",
    tagline: "Flags at-risk customers before they cancel",
    what: "Monitors product usage signals, login frequency, support activity, and contract dates. Flags churn risks and triggers a CS follow-up automatically.",
    inputs: ["Product usage data", "Login events", "Support ticket history", "Renewal date"],
    outputs: ["Churn risk score", "Alert to CS team", "Automated check-in message", "CRM update"],
    workflows: ["Churn Risk Alert", "Customer Success Check-in", "Renewal Reminder"],
    industries: ["SaaS / B2B"],
    approvalRequired: false,
    integrationRequired: true,
    integrations: ["Product analytics Webhook", "CRM", "Email"],
    status: "requires_integration",
  },
  {
    key: "review-request",
    name: "Review Request Agent",
    icon: "Star",
    color: "amber",
    tagline: "Collects reviews automatically after every interaction",
    what: "Sends timed review requests post-appointment, post-delivery, or post-service. Routes positive reviews to Google / platform and flags negative feedback for management.",
    inputs: ["Customer contact", "Service completion event", "Platform links"],
    outputs: ["Review request sent", "Review link delivered", "Negative feedback flagged", "Review count logged"],
    workflows: ["Review Request", "Review Collection", "Customer Feedback"],
    industries: ["Clinics", "Restaurants", "Local Services", "Ecommerce"],
    approvalRequired: false,
    integrationRequired: true,
    integrations: ["WhatsApp Business", "SMS", "Email"],
    status: "demo",
  },
  {
    key: "shipment-tracking",
    name: "Shipment Tracking Agent",
    icon: "Truck",
    color: "sky",
    tagline: "Tracks every shipment and surfaces exceptions early",
    what: "Polls logistics provider webhooks or APIs, updates shipment status, flags exceptions, and triggers escalation or vendor follow-up automatically.",
    inputs: ["Shipment IDs", "Carrier webhooks", "SLA thresholds"],
    outputs: ["Status updates", "Exception alerts", "SLA breach warnings", "Daily tracking report"],
    workflows: ["Shipment Status Update", "Delivery Exception Alert", "SLA Breach Alert"],
    industries: ["Logistics / Warehouse", "Ecommerce", "Manufacturing"],
    approvalRequired: false,
    integrationRequired: true,
    integrations: ["Logistics ERP Webhook", "Email", "SMS"],
    status: "requires_integration",
  },
  {
    key: "meeting-summary",
    name: "Meeting Summary Agent",
    icon: "FileText",
    color: "gray",
    tagline: "Turns meeting notes into action items automatically",
    what: "Processes meeting transcripts or notes, extracts action items with owners and deadlines, and distributes summaries to attendees.",
    inputs: ["Meeting notes or transcript", "Attendee list"],
    outputs: ["Structured summary", "Action items with owners", "Follow-up schedule", "Email distribution"],
    workflows: ["Meeting Notes to Action Items", "Meeting Summary", "Daily Task Summary"],
    industries: ["Agency", "Legal", "SaaS / B2B", "Manufacturing"],
    approvalRequired: false,
    integrationRequired: false,
    integrations: ["Email", "Google Docs"],
    status: "demo",
  },
];

// ── Workflow Templates ────────────────────────────────────────────────────────

export interface WorkflowStep {
  step: number;
  label: string;
  agent: string;
  humanCheckpoint: boolean;
}

export interface WorkflowTemplate {
  key: string;
  name: string;
  icon: string;
  color: string;
  trigger: string;
  businessUseCase: string;
  requiredIntegrations: string[];
  steps: WorkflowStep[];
  sampleOutput: string;
  roiEstimate: string;
  status: DeployStatus;
  industry: string;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    key: "lead-followup",
    name: "Lead Follow-up Workflow",
    icon: "TrendingUp",
    color: "indigo",
    trigger: "New lead captured via form, WhatsApp, or email",
    businessUseCase: "Automatically follow up with every new lead so none go cold.",
    requiredIntegrations: ["CRM", "Email or WhatsApp Business"],
    steps: [
      { step: 1, label: "Lead Capture Agent qualifies new lead", agent: "Lead Capture Agent", humanCheckpoint: false },
      { step: 2, label: "CRM Update Agent creates contact record", agent: "CRM Update Agent", humanCheckpoint: false },
      { step: 3, label: "Outreach Agent sends personalised intro message", agent: "Outreach Agent", humanCheckpoint: true },
      { step: 4, label: "Follow-up Agent runs timed follow-up sequence", agent: "Follow-up Agent", humanCheckpoint: false },
      { step: 5, label: "Report Agent logs outcome to daily summary", agent: "Report Agent", humanCheckpoint: false },
    ],
    sampleOutput: "86 leads contacted, 23 replied, 11 booked a call. 14 moved to qualified stage in CRM.",
    roiEstimate: "Save 12+ hours/week vs manual follow-up. 3x response rate vs cold email.",
    status: "demo",
    industry: "Agency, Real Estate, Education, SaaS",
  },
  {
    key: "hr-resume-screening",
    name: "Resume Screening Workflow",
    icon: "FileSearch",
    color: "violet",
    trigger: "New applications received via email or ATS upload",
    businessUseCase: "Screen and rank candidates automatically so recruiters only review top matches.",
    requiredIntegrations: ["Email or ATS CSV upload", "Google Sheets"],
    steps: [
      { step: 1, label: "Application collector gathers CVs from inbox", agent: "Document Collection Agent", humanCheckpoint: false },
      { step: 2, label: "Resume Parser Agent extracts structured data", agent: "Resume Parser Agent", humanCheckpoint: false },
      { step: 3, label: "Candidate Screening Agent scores against JD", agent: "Resume Parser Agent", humanCheckpoint: false },
      { step: 4, label: "Shortlist Approval — recruiter reviews ranked list", agent: "Resume Parser Agent", humanCheckpoint: true },
      { step: 5, label: "Scheduling Agent sends interview invites to shortlisted", agent: "Scheduling Agent", humanCheckpoint: false },
      { step: 6, label: "Report Agent generates hiring funnel report", agent: "Report Agent", humanCheckpoint: false },
    ],
    sampleOutput: "184 CVs parsed, 22 candidates shortlisted, 14 interviews scheduled. Recruiter saved 11 hours.",
    roiEstimate: "Cut time-to-shortlist from 3 days to 3 hours. Process 10x more applications per recruiter.",
    status: "demo",
    industry: "HR / Recruitment",
  },
  {
    key: "appointment-booking",
    name: "Appointment Booking Workflow",
    icon: "CalendarCheck",
    color: "rose",
    trigger: "Patient / student / customer requests appointment via WhatsApp or website",
    businessUseCase: "Handle all appointment requests and confirmations without a receptionist.",
    requiredIntegrations: ["WhatsApp Business or SMS", "Google Calendar"],
    steps: [
      { step: 1, label: "Front Desk Agent receives and validates request", agent: "Scheduling Agent", humanCheckpoint: false },
      { step: 2, label: "Scheduling Agent checks calendar and proposes slots", agent: "Scheduling Agent", humanCheckpoint: false },
      { step: 3, label: "Reminder Agent sends confirmation and reminders", agent: "Review Request Agent", humanCheckpoint: false },
      { step: 4, label: "No-show: Recovery Agent sends follow-up", agent: "Follow-up Agent", humanCheckpoint: false },
      { step: 5, label: "Report Agent logs daily appointment summary", agent: "Report Agent", humanCheckpoint: false },
    ],
    sampleOutput: "48 appointments booked, 91 reminders sent, 15 no-shows recovered, 37 FAQs handled.",
    roiEstimate: "Reduce no-shows by 40%. Save 28 front-desk hours/week.",
    status: "demo",
    industry: "Clinics, Education, Local Services",
  },
  {
    key: "cod-confirmation",
    name: "COD Confirmation Workflow",
    icon: "ShoppingCart",
    color: "orange",
    trigger: "New COD order placed on ecommerce platform",
    businessUseCase: "Confirm every COD order before dispatch to reduce returns and RTO costs.",
    requiredIntegrations: ["Shopify or ecommerce webhook", "WhatsApp Business or SMS"],
    steps: [
      { step: 1, label: "Order event triggers COD Confirmation Agent", agent: "COD Confirmation Agent", humanCheckpoint: false },
      { step: 2, label: "Agent sends confirmation message to buyer", agent: "COD Confirmation Agent", humanCheckpoint: false },
      { step: 3, label: "Buyer confirms or cancels — status logged", agent: "Customer Support Agent", humanCheckpoint: false },
      { step: 4, label: "Unconfirmed after 2 attempts — escalation flagged", agent: "Customer Support Agent", humanCheckpoint: true },
      { step: 5, label: "Report Agent logs daily confirmation rate", agent: "Report Agent", humanCheckpoint: false },
    ],
    sampleOutput: "73 COD orders confirmed, 9 cancelled before dispatch. Saved ₹18,000 in return costs.",
    roiEstimate: "Reduce RTO by 30–50%. Save ₹15,000–₹40,000/month in return logistics.",
    status: "requires_integration",
    industry: "Ecommerce",
  },
  {
    key: "abandoned-cart",
    name: "Abandoned Cart Recovery",
    icon: "RotateCcw",
    color: "amber",
    trigger: "Cart abandoned for more than 1 hour without checkout",
    businessUseCase: "Recover lost revenue from shoppers who left without buying.",
    requiredIntegrations: ["Shopify webhook", "WhatsApp Business or Email"],
    steps: [
      { step: 1, label: "Cart abandonment event triggers recovery workflow", agent: "Cart Recovery Agent", humanCheckpoint: false },
      { step: 2, label: "Agent sends personalised reminder with cart link", agent: "Cart Recovery Agent", humanCheckpoint: false },
      { step: 3, label: "Follow-up with offer if no purchase after 24h", agent: "Follow-up Agent", humanCheckpoint: true },
      { step: 4, label: "Purchase confirmed — recovery logged", agent: "Store Report Agent", humanCheckpoint: false },
    ],
    sampleOutput: "₹48,000 recovered from 19 abandoned carts in 7 days. 26% recovery rate.",
    roiEstimate: "Recover 20–30% of abandoned carts. Average ₹40,000–₹1L additional revenue/month.",
    status: "requires_integration",
    industry: "Ecommerce",
  },
  {
    key: "invoice-reminder",
    name: "Invoice Payment Reminder",
    icon: "CreditCard",
    color: "slate",
    trigger: "Invoice due date approaching or passed",
    businessUseCase: "Collect overdue payments without awkward manual follow-ups. All outputs for accountant review.",
    requiredIntegrations: ["Email or WhatsApp Business", "Tally Webhook or Google Sheets"],
    steps: [
      { step: 1, label: "Invoice Reminder Agent identifies overdue invoices", agent: "Invoice Reminder Agent", humanCheckpoint: false },
      { step: 2, label: "Agent sends Day 1 polite reminder", agent: "Invoice Reminder Agent", humanCheckpoint: false },
      { step: 3, label: "Day 3 — escalated follow-up with payment link", agent: "Payment Follow-up Agent", humanCheckpoint: false },
      { step: 4, label: "Day 7 — human review for escalation decision", agent: "Receivables Agent", humanCheckpoint: true },
      { step: 5, label: "Receivables Agent updates payment status", agent: "Receivables Agent", humanCheckpoint: false },
    ],
    sampleOutput: "22 invoice reminders sent. 14 paid within 3 days. ₹3.2L recovered this month.",
    roiEstimate: "Reduce days sales outstanding by 8–12 days. Recover 60–80% of overdue payments.",
    status: "demo",
    industry: "Finance / Accounting, Legal, Local Services",
  },
  {
    key: "daily-report",
    name: "Daily Business Report",
    icon: "BarChart2",
    color: "teal",
    trigger: "Daily schedule (end of business day)",
    businessUseCase: "Get a comprehensive automated daily report without anyone manually compiling data.",
    requiredIntegrations: ["Google Sheets or CRM", "Email"],
    steps: [
      { step: 1, label: "Report Agent pulls data from all integrations", agent: "Report Agent", humanCheckpoint: false },
      { step: 2, label: "Agent compiles activity summary and KPIs", agent: "Report Agent", humanCheckpoint: false },
      { step: 3, label: "Report formatted and sent to management", agent: "Report Agent", humanCheckpoint: false },
      { step: 4, label: "Exceptions flagged for next-day review", agent: "Report Agent", humanCheckpoint: true },
    ],
    sampleOutput: "Daily report generated: 312 shipments tracked, 18 exceptions flagged, 6 SLA risks identified.",
    roiEstimate: "Save 2 hours/day in manual reporting. Faster decisions with real-time daily data.",
    status: "demo",
    industry: "Logistics, Manufacturing, Agency, SaaS",
  },
  {
    key: "churn-risk-alert",
    name: "Churn Risk Alert Workflow",
    icon: "TrendingDown",
    color: "rose",
    trigger: "Usage signals drop below threshold or renewal date within 30 days",
    businessUseCase: "Identify and intervene with at-risk customers before they cancel.",
    requiredIntegrations: ["Product analytics Webhook", "CRM", "Email"],
    steps: [
      { step: 1, label: "Churn Risk Agent monitors usage signals daily", agent: "Churn Risk Agent", humanCheckpoint: false },
      { step: 2, label: "At-risk customer flagged and scored", agent: "Churn Risk Agent", humanCheckpoint: false },
      { step: 3, label: "CS Agent sends personalised check-in message", agent: "Customer Success Agent", humanCheckpoint: true },
      { step: 4, label: "Renewal Agent schedules renewal conversation", agent: "Renewal Agent", humanCheckpoint: false },
      { step: 5, label: "Outcome logged — saved or churned", agent: "Report Agent", humanCheckpoint: false },
    ],
    sampleOutput: "6 churn risks flagged. 4 re-engaged after CS check-in. 2 escalated to account manager. ₹7.4L pipeline saved.",
    roiEstimate: "Prevent 1–3 churns/month. Each prevented churn saves full ACV.",
    status: "requires_integration",
    industry: "SaaS / B2B",
  },
  {
    key: "client-reporting",
    name: "Client Reporting Workflow",
    icon: "FileText",
    color: "indigo",
    trigger: "Monthly or weekly schedule, or manual trigger",
    businessUseCase: "Generate and deliver professional client reports automatically — no manual compilation.",
    requiredIntegrations: ["Google Sheets or CRM", "Email"],
    steps: [
      { step: 1, label: "Campaign Analyst Agent pulls performance data", agent: "Campaign Analyst Agent", humanCheckpoint: false },
      { step: 2, label: "Report Agent formats into branded client report", agent: "Report Agent", humanCheckpoint: false },
      { step: 3, label: "Account Manager Agent reviews before sending", agent: "Account Manager Agent", humanCheckpoint: true },
      { step: 4, label: "Report Agent delivers report to client via email", agent: "Report Agent", humanCheckpoint: false },
    ],
    sampleOutput: "8 client reports generated, reviewed, and delivered in 2 hours. Previously took 2 days.",
    roiEstimate: "Save 16 hours/month per agency. Impress clients with faster, more consistent reporting.",
    status: "demo",
    industry: "Agency",
  },
  {
    key: "shipment-tracking",
    name: "Shipment Tracking & Exception Alert",
    icon: "Truck",
    color: "sky",
    trigger: "Shipment status webhook from logistics provider",
    businessUseCase: "Track every shipment and surface exceptions before they become complaints.",
    requiredIntegrations: ["Logistics ERP Webhook", "Email or SMS"],
    steps: [
      { step: 1, label: "Shipment Tracking Agent polls carrier for updates", agent: "Shipment Tracking Agent", humanCheckpoint: false },
      { step: 2, label: "Exception Alert Agent flags delayed / failed deliveries", agent: "Exception Alert Agent", humanCheckpoint: false },
      { step: 3, label: "Vendor Coordination Agent notifies relevant parties", agent: "Vendor Coordination Agent", humanCheckpoint: false },
      { step: 4, label: "SLA Monitor Agent flags breach risk for review", agent: "SLA Monitor Agent", humanCheckpoint: true },
      { step: 5, label: "Warehouse Report Agent adds to daily ops report", agent: "Warehouse Report Agent", humanCheckpoint: false },
    ],
    sampleOutput: "312 shipments tracked, 18 exceptions flagged, 6 SLA risks surfaced before breach.",
    roiEstimate: "Prevent 5+ SLA breaches/month. Save ₹50,000–₹2L in penalty exposure.",
    status: "requires_integration",
    industry: "Logistics / Warehouse",
  },
  {
    key: "meeting-to-actions",
    name: "Meeting Notes to Action Items",
    icon: "MessageCircle",
    color: "violet",
    trigger: "Meeting notes or transcript uploaded or pasted",
    businessUseCase: "Convert every meeting into a structured action plan without anyone manually writing notes.",
    requiredIntegrations: ["Email", "Google Docs"],
    steps: [
      { step: 1, label: "Meeting Summary Agent processes notes / transcript", agent: "Meeting Summary Agent", humanCheckpoint: false },
      { step: 2, label: "Action items extracted with owners and deadlines", agent: "Meeting Summary Agent", humanCheckpoint: false },
      { step: 3, label: "Human review — confirm owners and dates", agent: "Meeting Summary Agent", humanCheckpoint: true },
      { step: 4, label: "Summary distributed to attendees via email", agent: "Meeting Summary Agent", humanCheckpoint: false },
      { step: 5, label: "Deadline Reminder Agent schedules follow-ups", agent: "Deadline Reminder Agent", humanCheckpoint: false },
    ],
    sampleOutput: "7 action items extracted from 45-min meeting. Distributed to 4 attendees with deadlines in < 5 minutes.",
    roiEstimate: "Save 30 minutes per meeting. Never lose an action item from a meeting.",
    status: "demo",
    industry: "Agency, Legal, SaaS",
  },
];

// ── Activity Feed ─────────────────────────────────────────────────────────────

export type ActivityStatus = "completed" | "pending_approval" | "in_progress" | "failed";

export interface ActivityItem {
  id: string;
  agent: string;
  agentIcon: string;
  action: string;
  count: number;
  unit: string;
  industry: string;
  status: ActivityStatus;
  timeAgo: string;
}

export const ACTIVITY_FEED: ActivityItem[] = [
  { id: "1", agent: "Property Follow-up Agent", agentIcon: "Home", action: "followed up with", count: 86, unit: "property leads", industry: "Real Estate", status: "completed", timeAgo: "2 min ago" },
  { id: "2", agent: "COD Confirmation Agent", agentIcon: "ShoppingCart", action: "confirmed", count: 43, unit: "COD orders", industry: "Ecommerce", status: "completed", timeAgo: "5 min ago" },
  { id: "3", agent: "Agency Report Agent", agentIcon: "Building2", action: "generated", count: 7, unit: "client reports", industry: "Agency", status: "completed", timeAgo: "12 min ago" },
  { id: "4", agent: "Logistics Exception Agent", agentIcon: "Truck", action: "flagged", count: 12, unit: "delayed shipments", industry: "Logistics", status: "pending_approval", timeAgo: "18 min ago" },
  { id: "5", agent: "Clinic Reminder Agent", agentIcon: "Stethoscope", action: "sent", count: 58, unit: "appointment reminders", industry: "Clinics", status: "completed", timeAgo: "23 min ago" },
  { id: "6", agent: "SaaS Trial Nurture Agent", agentIcon: "Layers", action: "followed up with", count: 31, unit: "trial users", industry: "SaaS / B2B", status: "completed", timeAgo: "31 min ago" },
  { id: "7", agent: "Finance Invoice Agent", agentIcon: "CreditCard", action: "sent", count: 22, unit: "invoice reminders", industry: "Finance", status: "completed", timeAgo: "45 min ago" },
  { id: "8", agent: "Education Demo Scheduler", agentIcon: "GraduationCap", action: "booked", count: 19, unit: "demo classes", industry: "Education", status: "completed", timeAgo: "1h ago" },
  { id: "9", agent: "HR Shortlist Agent", agentIcon: "Users", action: "shortlisted", count: 22, unit: "candidates", industry: "HR", status: "pending_approval", timeAgo: "1h 15m ago" },
  { id: "10", agent: "Manufacturing KPI Agent", agentIcon: "Factory", action: "generated", count: 1, unit: "daily ops report", industry: "Manufacturing", status: "completed", timeAgo: "2h ago" },
  { id: "11", agent: "Legal Deadline Agent", agentIcon: "Briefcase", action: "sent", count: 11, unit: "deadline reminders", industry: "Legal", status: "completed", timeAgo: "2h 30m ago" },
  { id: "12", agent: "Restaurant Review Agent", agentIcon: "UtensilsCrossed", action: "requested", count: 38, unit: "customer reviews", industry: "Restaurants", status: "completed", timeAgo: "3h ago" },
  { id: "13", agent: "Local Booking Agent", agentIcon: "MapPin", action: "handled", count: 67, unit: "bookings", industry: "Local Services", status: "completed", timeAgo: "3h 20m ago" },
  { id: "14", agent: "Cart Recovery Agent", agentIcon: "RotateCcw", action: "recovered", count: 19, unit: "abandoned carts", industry: "Ecommerce", status: "completed", timeAgo: "4h ago" },
];

// ── ROI Metrics ───────────────────────────────────────────────────────────────

export interface ROIMetric {
  label: string;
  value: string;
  sub: string;
  icon: string;
  color: string;
}

export const ROI_METRICS: ROIMetric[] = [
  { label: "Hours Saved This Month", value: "347h", sub: "across all active packs", icon: "Clock", color: "indigo" },
  { label: "Tasks Automated", value: "4,821", sub: "actions completed by AI agents", icon: "Zap", color: "violet" },
  { label: "Leads Recovered", value: "94", sub: "cold leads re-engaged", icon: "TrendingUp", color: "emerald" },
  { label: "Appointments Booked", value: "186", sub: "bookings confirmed automatically", icon: "CalendarCheck", color: "teal" },
  { label: "Revenue Opportunity", value: "₹18.4L", sub: "pipeline created or recovered", icon: "CreditCard", color: "amber" },
  { label: "Support Tickets Resolved", value: "312", sub: "without human involvement", icon: "CheckCircle2", color: "rose" },
  { label: "Reports Generated", value: "89", sub: "daily, weekly, and monthly", icon: "BarChart2", color: "sky" },
  { label: "Invoices Followed Up", value: "127", sub: "overdue payments chased", icon: "FileText", color: "slate" },
];

// ── Industry Dashboards ───────────────────────────────────────────────────────

export interface DashboardMetric {
  label: string;
  value: string;
  icon: string;
  color: string;
  trend?: string;
}

export interface IndustryDashboard {
  key: string;
  title: string;
  metrics: DashboardMetric[];
}

export const INDUSTRY_DASHBOARDS: IndustryDashboard[] = [
  {
    key: "agency",
    title: "Agency Operations Dashboard",
    metrics: [
      { label: "Active Clients", value: "24", icon: "Building2", color: "indigo", trend: "+3 this month" },
      { label: "Leads Generated", value: "127", icon: "Target", color: "violet", trend: "This week" },
      { label: "Proposals Sent", value: "14", icon: "Send", color: "emerald", trend: "Awaiting reply" },
      { label: "Follow-ups Completed", value: "89", icon: "RefreshCw", color: "amber", trend: "Auto-sent" },
      { label: "Reports Generated", value: "8", icon: "BarChart2", color: "teal", trend: "For clients" },
      { label: "Hours Saved", value: "42h", icon: "Clock", color: "rose", trend: "This week" },
      { label: "Recurring Revenue Est.", value: "₹4.2L", icon: "TrendingUp", color: "sky", trend: "Active retainers" },
      { label: "Client Accounts Managed", value: "24", icon: "Layers", color: "pink", trend: "All active" },
    ],
  },
  {
    key: "real-estate",
    title: "Real Estate Pipeline Dashboard",
    metrics: [
      { label: "New Leads", value: "86", icon: "Target", color: "emerald", trend: "This week" },
      { label: "Hot Leads", value: "23", icon: "Flame", color: "rose", trend: "High intent" },
      { label: "Site Visits Booked", value: "11", icon: "CalendarCheck", color: "teal", trend: "Confirmed" },
      { label: "Follow-ups Completed", value: "64", icon: "RefreshCw", color: "indigo", trend: "Auto-sent" },
      { label: "Cold Leads Revived", value: "9", icon: "RotateCcw", color: "violet", trend: "Re-engaged" },
      { label: "Properties Matched", value: "31", icon: "Home", color: "amber", trend: "Buyer match" },
      { label: "Pending Calls", value: "7", icon: "Bell", color: "orange", trend: "Awaiting broker" },
      { label: "Revenue Pipeline", value: "₹1.8Cr", icon: "TrendingUp", color: "emerald", trend: "Active deals" },
    ],
  },
  {
    key: "hr",
    title: "HR Recruitment Pipeline Dashboard",
    metrics: [
      { label: "Open Roles", value: "8", icon: "Briefcase", color: "violet", trend: "Active JDs" },
      { label: "Resumes Received", value: "184", icon: "FileText", color: "indigo", trend: "This week" },
      { label: "Candidates Parsed", value: "184", icon: "FileSearch", color: "sky", trend: "AI scored" },
      { label: "Shortlisted", value: "22", icon: "CheckCircle2", color: "emerald", trend: "Top matches" },
      { label: "Interviews Scheduled", value: "14", icon: "CalendarCheck", color: "teal", trend: "Confirmed" },
      { label: "Pending Approvals", value: "3", icon: "AlertTriangle", color: "amber", trend: "Shortlist review" },
      { label: "Time Saved", value: "11h", icon: "Clock", color: "rose", trend: "This week" },
      { label: "Cost Saved Est.", value: "₹48,000", icon: "CreditCard", color: "slate", trend: "Recruiter hours" },
    ],
  },
  {
    key: "education",
    title: "Admissions Pipeline Dashboard",
    metrics: [
      { label: "New Inquiries", value: "214", icon: "Inbox", color: "amber", trend: "This week" },
      { label: "Demos Booked", value: "37", icon: "CalendarCheck", color: "teal", trend: "Confirmed" },
      { label: "Follow-ups Sent", value: "91", icon: "RefreshCw", color: "indigo", trend: "Auto-sent" },
      { label: "Drop-offs Recovered", value: "18", icon: "RotateCcw", color: "emerald", trend: "Re-engaged" },
      { label: "Fee Reminders Sent", value: "43", icon: "Bell", color: "orange", trend: "Pending fees" },
      { label: "Students Onboarded", value: "29", icon: "GraduationCap", color: "violet", trend: "This month" },
      { label: "Counselor Hours Saved", value: "25h", icon: "Clock", color: "rose", trend: "This week" },
      { label: "Revenue Pipeline", value: "₹8.6L", icon: "TrendingUp", color: "amber", trend: "Admission est." },
    ],
  },
  {
    key: "ecommerce",
    title: "Ecommerce Operations Dashboard",
    metrics: [
      { label: "COD Orders Confirmed", value: "73", icon: "CheckCircle2", color: "emerald", trend: "Today" },
      { label: "Carts Recovered", value: "19", icon: "RotateCcw", color: "orange", trend: "₹48,000 value" },
      { label: "Support Tickets Resolved", value: "112", icon: "MessageCircle", color: "sky", trend: "Without human" },
      { label: "Reviews Requested", value: "39", icon: "Star", color: "amber", trend: "Post-delivery" },
      { label: "Returns Handled", value: "8", icon: "RefreshCw", color: "rose", trend: "Initiated" },
      { label: "Delayed Orders Flagged", value: "5", icon: "AlertTriangle", color: "red", trend: "SLA risk" },
      { label: "Repeat Messages Sent", value: "31", icon: "Send", color: "violet", trend: "Past customers" },
      { label: "Revenue Recovered", value: "₹48,000", icon: "TrendingUp", color: "emerald", trend: "Cart recovery" },
    ],
  },
  {
    key: "clinic",
    title: "Clinic Operations Dashboard",
    metrics: [
      { label: "Appointments Booked", value: "48", icon: "CalendarCheck", color: "rose", trend: "Today" },
      { label: "Reminders Sent", value: "91", icon: "Bell", color: "amber", trend: "Auto-sent" },
      { label: "Missed Appts Recovered", value: "15", icon: "RotateCcw", color: "emerald", trend: "Rescheduled" },
      { label: "Follow-up Care Sent", value: "22", icon: "Heart", color: "rose", trend: "Post-visit" },
      { label: "Patient FAQs Handled", value: "37", icon: "MessageCircle", color: "sky", trend: "Without staff" },
      { label: "Reviews Requested", value: "18", icon: "Star", color: "orange", trend: "Auto-sent" },
      { label: "Front Desk Hours Saved", value: "28h", icon: "Clock", color: "teal", trend: "This week" },
      { label: "Doctor Schedule Updates", value: "6", icon: "CalendarCheck", color: "violet", trend: "Coordinated" },
    ],
  },
  {
    key: "logistics",
    title: "Logistics & Warehouse Dashboard",
    metrics: [
      { label: "Shipments Tracked", value: "312", icon: "Truck", color: "sky", trend: "Today" },
      { label: "Exceptions Flagged", value: "18", icon: "AlertTriangle", color: "rose", trend: "Action needed" },
      { label: "Documents Verified", value: "64", icon: "FileCheck", color: "emerald", trend: "Cleared" },
      { label: "Vendors Contacted", value: "11", icon: "Send", color: "violet", trend: "Auto-sent" },
      { label: "Pickups Scheduled", value: "23", icon: "CalendarCheck", color: "teal", trend: "Confirmed" },
      { label: "SLA Risks", value: "6", icon: "ShieldAlert", color: "amber", trend: "Under review" },
      { label: "Ops Hours Saved", value: "38h", icon: "Clock", color: "indigo", trend: "This week" },
      { label: "Delays Reduced", value: "25%", icon: "TrendingDown", color: "rose", trend: "vs last month" },
    ],
  },
  {
    key: "saas",
    title: "SaaS Revenue Dashboard",
    metrics: [
      { label: "Leads Qualified", value: "54", icon: "Target", color: "teal", trend: "This week" },
      { label: "Demos Scheduled", value: "9", icon: "CalendarCheck", color: "indigo", trend: "Confirmed" },
      { label: "Trial Users Followed Up", value: "54", icon: "RefreshCw", color: "violet", trend: "Auto-sent" },
      { label: "Churn Risks Flagged", value: "6", icon: "AlertTriangle", color: "rose", trend: "Needs CS action" },
      { label: "Renewals Reminded", value: "12", icon: "Bell", color: "amber", trend: "Due this month" },
      { label: "Support Summaries", value: "31", icon: "MessageCircle", color: "sky", trend: "Auto-generated" },
      { label: "Pipeline Updated", value: "₹7.4L", icon: "TrendingUp", color: "emerald", trend: "CRM synced" },
      { label: "CS Hours Saved", value: "50h", icon: "Clock", color: "slate", trend: "This week" },
    ],
  },
  {
    key: "finance",
    title: "Finance & Accounts Dashboard",
    metrics: [
      { label: "Invoices Followed Up", value: "22", icon: "CreditCard", color: "slate", trend: "This week" },
      { label: "Documents Collected", value: "14", icon: "FileCheck", color: "emerald", trend: "From clients" },
      { label: "Pending Payments", value: "8", icon: "AlertTriangle", color: "rose", trend: "Overdue" },
      { label: "Compliance Reminders", value: "19", icon: "Bell", color: "amber", trend: "GST / Tax" },
      { label: "Reports Generated", value: "6", icon: "BarChart2", color: "indigo", trend: "Client reports" },
      { label: "Receivables Flagged", value: "₹3.2L", icon: "TrendingDown", color: "rose", trend: "Overdue value" },
      { label: "Client Follow-ups Done", value: "31", icon: "RefreshCw", color: "teal", trend: "Auto-sent" },
      { label: "Finance Hours Saved", value: "32h", icon: "Clock", color: "violet", trend: "This week" },
    ],
  },
  {
    key: "legal",
    title: "Legal Practice Dashboard",
    metrics: [
      { label: "Clients Onboarded", value: "6", icon: "UserCheck", color: "gray", trend: "This month" },
      { label: "Documents Pending", value: "19", icon: "FileText", color: "amber", trend: "Awaiting clients" },
      { label: "Consultations Booked", value: "11", icon: "CalendarCheck", color: "teal", trend: "Confirmed" },
      { label: "Deadlines Tracked", value: "23", icon: "Bell", color: "rose", trend: "Active" },
      { label: "Client Updates Sent", value: "17", icon: "Send", color: "indigo", trend: "Auto-sent" },
      { label: "Summaries Generated", value: "4", icon: "FileCheck", color: "emerald", trend: "For review" },
      { label: "Pending Approvals", value: "3", icon: "AlertTriangle", color: "orange", trend: "Draft reports" },
      { label: "Professional Hours Saved", value: "20h", icon: "Clock", color: "slate", trend: "This week" },
    ],
  },
  {
    key: "restaurant",
    title: "Restaurant & Hospitality Dashboard",
    metrics: [
      { label: "Reservations Handled", value: "53", icon: "CalendarCheck", color: "rose", trend: "Today" },
      { label: "Reviews Requested", value: "38", icon: "Star", color: "amber", trend: "Auto-sent" },
      { label: "Complaints Escalated", value: "4", icon: "AlertTriangle", color: "rose", trend: "To manager" },
      { label: "Repeat Customers Contacted", value: "21", icon: "RefreshCw", color: "emerald", trend: "Promotions sent" },
      { label: "Inventory Reminders", value: "8", icon: "ShoppingCart", color: "orange", trend: "Low stock" },
      { label: "Event Inquiries Followed Up", value: "6", icon: "Send", color: "violet", trend: "Auto-sent" },
      { label: "Daily Reports Generated", value: "1", icon: "BarChart2", color: "teal", trend: "Today" },
      { label: "Manager Hours Saved", value: "22h", icon: "Clock", color: "indigo", trend: "This week" },
    ],
  },
  {
    key: "manufacturing",
    title: "Manufacturing Operations Dashboard",
    metrics: [
      { label: "Production Reports", value: "1", icon: "BarChart2", color: "zinc", trend: "Generated today" },
      { label: "Maintenance Alerts", value: "3", icon: "AlertTriangle", color: "rose", trend: "Action needed" },
      { label: "Inventory Risks", value: "2", icon: "ShoppingCart", color: "amber", trend: "Low stock" },
      { label: "Vendor Follow-ups", value: "7", icon: "Send", color: "indigo", trend: "Auto-sent" },
      { label: "Quality Issues Flagged", value: "2", icon: "ShieldAlert", color: "rose", trend: "Escalated" },
      { label: "Dispatches Coordinated", value: "14", icon: "Truck", color: "sky", trend: "Today" },
      { label: "Downtime Alerts", value: "1", icon: "Bell", color: "orange", trend: "Active" },
      { label: "Ops Hours Saved", value: "30h", icon: "Clock", color: "teal", trend: "This week" },
    ],
  },
  {
    key: "local-services",
    title: "Local Business Dashboard",
    metrics: [
      { label: "Bookings Handled", value: "67", icon: "CalendarCheck", color: "pink", trend: "Today" },
      { label: "Reminders Sent", value: "84", icon: "Bell", color: "amber", trend: "Auto-sent" },
      { label: "Missed Bookings Recovered", value: "8", icon: "RotateCcw", color: "emerald", trend: "Rescheduled" },
      { label: "Reviews Requested", value: "31", icon: "Star", color: "rose", trend: "Auto-sent" },
      { label: "Payment Reminders", value: "12", icon: "CreditCard", color: "slate", trend: "Pending" },
      { label: "Repeat Customers Contacted", value: "19", icon: "RefreshCw", color: "teal", trend: "Promotions" },
      { label: "Inquiries Answered", value: "23", icon: "MessageCircle", color: "violet", trend: "Without staff" },
      { label: "Owner Hours Saved", value: "18h", icon: "Clock", color: "indigo", trend: "This week" },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function statusLabel(s: DeployStatus): string {
  return {
    ready: "Ready",
    demo: "Sample Preview",
    requires_integration: "Requires Integration",
    custom_setup: "Custom Setup",
  }[s];
}

export function statusColor(s: DeployStatus): string {
  return {
    ready: "bg-emerald-100 text-emerald-700",
    demo: "bg-blue-100 text-blue-700",
    requires_integration: "bg-amber-100 text-amber-700",
    custom_setup: "bg-slate-100 text-slate-700",
  }[s];
}
