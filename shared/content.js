/**
 * shared/content.js
 * ---------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for all demo content.
 *
 * The browser reads it as `window.ROSSELL_CONTENT` (script tag in index.html),
 * the Express seeder reads it through `require("../shared/content.js")`.
 * That way the static site, the API and the database never disagree.
 *
 * TODO: replace every piece of dummy copy below with real Rossell content.
 * TODO: blog images live in /assets/img/*.jpg — swap them for final artwork.
 * TODO: company names, people and metrics are placeholders, not real claims.
 * ---------------------------------------------------------------------------
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ROSSELL_CONTENT = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const stats = [
    // TODO: real numbers from the business dashboard
    { key: "teams", label: "Teams using Rossell", value: 4200, suffix: "+", format: "number" },
    { key: "reports", label: "Reports delivered", value: 186000, suffix: "", format: "compact" },
    { key: "hours", label: "Hours saved every month", value: 12400, suffix: "", format: "compact" },
    { key: "uptime", label: "Uptime, last 12 months", value: 99.98, suffix: "%", format: "decimal" },
  ];

  const trustedBy = [
    // TODO: replace with real customer logos (text wordmarks for now)
    "NORTHWIND",
    "LUMEN LABS",
    "KESTREL",
    "APERTURE",
    "HALDEN",
    "VANTAGE",
  ];

  const metrics = [
    {
      key: "revenue",
      label: "Net revenue",
      shortLabel: "Revenue",
      format: "currency",
      value: 128400,
      delta: 12.4,
      series: [62, 68, 65, 74, 79, 76, 88, 92, 97, 104, 112, 128],
      timeframe: "Last 12 weeks",
    },
    {
      key: "active-users",
      label: "Active users",
      shortLabel: "Users",
      format: "number",
      value: 8420,
      delta: 8.2,
      series: [48, 52, 57, 54, 61, 66, 64, 72, 75, 78, 81, 84],
      timeframe: "Last 12 weeks",
    },
    {
      key: "retention",
      label: "Retention",
      shortLabel: "Retention",
      format: "percent",
      value: 92.4,
      delta: 2.1,
      series: [76, 78, 77, 81, 80, 84, 86, 85, 88, 90, 91, 92],
      timeframe: "Last 12 weeks",
    },
    {
      key: "reports",
      label: "Reports delivered",
      shortLabel: "Reports",
      format: "number",
      value: 1936,
      delta: 21.6,
      series: [22, 26, 31, 29, 36, 42, 47, 45, 53, 58, 63, 71],
      timeframe: "Last 12 weeks",
    },
  ];

  const channels = [
    // TODO: replace with real acquisition/usage channels
    { label: "Product teams", value: 42 },
    { label: "Engineering", value: 28 },
    { label: "Design", value: 18 },
    { label: "Operations", value: 12 },
  ];

  const posts = [
    {
      slug: "reporting-habit-five-hours",
      title: "The reporting habit that gives every team five hours back",
      category: "Product",
      excerpt:
        "Most teams do not have a reporting problem. They have a timing problem. Here is the weekly rhythm we use to keep decisions ahead of the meeting.",
      publishedAt: "2026-11-12",
      readTime: 6,
      image: {
        src: "./assets/img/blog-reporting.jpg",
        alt: "A tidy stack of translucent paper sheets on a wooden desk in soft daylight",
      },
      author: { name: "Mina Okafor", role: "Head of Product" },
      featured: true,
      body: [
        "Reporting rarely fails because the numbers are wrong. It fails because the numbers arrive after the decision has already been made in a hallway conversation. By the time a deck reaches the leadership meeting, the work it describes is two weeks old and the team has moved on.",
        "The fix is a rhythm rather than a tool. Every Monday morning, Rossell assembles the same five numbers from the tools the team already uses, drafts the commentary from the work that changed, and drops it into the channel where the team starts the week. Nobody writes a status update. Nobody formats a slide.",
        "We tested this with twelve teams over a quarter. The median time spent assembling reports fell from six hours a week to a little under one, and the share of decisions that referenced data in the meeting rose from 34% to 71%. The reports did not get longer. They got earlier.",
      ],
    },
    {
      slug: "dashboards-people-open",
      title: "Designing dashboards people actually open",
      category: "Design",
      excerpt:
        "A dashboard is not a wall of numbers. It is a point of view about what matters this week. A short field guide from our design team.",
      publishedAt: "2026-10-29",
      readTime: 7,
      image: {
        src: "./assets/img/blog-dashboards.jpg",
        alt: "Top-down view of grid paper, a steel ruler and a drafting compass on a warm desk",
      },
      author: { name: "Elias Braun", role: "Design Lead" },
      featured: true,
      body: [
        "The first question we ask in any dashboard review is not which chart to use. It is what decision this screen should make easier. If the answer is vague, the layout will be vague too, and the dashboard will be opened once and forgotten.",
        "Three habits make the difference. Put the number that changes behaviour in the largest type. Give every trend a comparison so it can be read without context. And write the sentence you would say out loud if you were presenting it — a single line of plain language under each chart does more than any tooltip.",
        "The rest is restraint. We keep dashboards to five modules, and every module has to earn its place by answering a question that someone actually asked in the last thirty days. When a module stops being asked about, it leaves. A dashboard is a living document, not a monument.",
      ],
    },
    {
      slug: "forty-million-events-a-day",
      title: "What we learned moving forty million events a day",
      category: "Engineering",
      excerpt:
        "A migration story without heroics: smaller batches, boring queues, and the observability we wish we had written first.",
      publishedAt: "2026-10-08",
      readTime: 9,
      image: {
        src: "./assets/img/blog-infrastructure.jpg",
        alt: "Macro photo of grey fiber optic cables with brushed metal connectors",
      },
      author: { name: "Priya Raman", role: "Staff Engineer" },
      featured: true,
      body: [
        "We moved the ingestion pipeline from a nightly batch job to a streaming writer while the product kept running. The plan fit on one page: shrink the batches, duplicate the writes, compare the outputs, then delete the old path. Everything else was patience.",
        "The unglamorous part was measurement. We added per-tenant lag, write amplification and duplicate counters before the migration started, which meant we could see exactly which customer accounts would be affected if we rolled back. That instrumentation is still the reason on-call is quiet at three in the morning.",
        "The lesson we keep repeating to ourselves: an event pipeline is a product with users. It has an interface, a budget and a failure mode that someone has to explain to a customer. Once we treated it that way, the architecture decisions became obvious.",
      ],
    },
    {
      slug: "metrics-that-lie",
      title: "Metrics that look precise but lie",
      category: "Product",
      excerpt:
        "Averages hide the story, percentages hide the base, and a clean line chart can hide a definition change. Four checks to run before you trust a number.",
      publishedAt: "2026-09-24",
      readTime: 5,
      image: {
        src: "./assets/img/blog-metrics.jpg",
        alt: "Light refracted through a slab of textured glass casting geometric shadows",
      },
      author: { name: "Mina Okafor", role: "Head of Product" },
      featured: false,
      body: [
        "Precision is not the same as truth. A dashboard can show 92.4% retention with four decimal places and still be describing a population that changed shape last month. The number is exact. The meaning is not.",
        "We run four checks before a metric becomes official. Is the denominator defined and stable? Has the definition changed since the last period? Does the segment structure explain the movement? And would three different people reading this chart draw the same conclusion?",
        "When a metric fails, we do not hide it. We label it, date the change, and add a note explaining what moved. It is less impressive in a board deck, and it is the reason people trust the numbers the rest of the year.",
      ],
    },
    {
      slug: "from-thread-to-decision",
      title: "From a Slack thread to a shipped decision",
      category: "Company",
      excerpt:
        "How we turn long internal debates into short written decisions — and why the archive is the most valuable part.",
      publishedAt: "2026-09-03",
      readTime: 4,
      image: {
        src: "./assets/img/blog-decisions.jpg",
        alt: "Matte grey index cards arranged in an overlapping sequence on a cream table",
      },
      author: { name: "Tomas Lind", role: "Chief Operating Officer" },
      featured: false,
      body: [
        "Every company has a version of the same thread: forty messages, three strong opinions, and no record of what was decided. We replaced ours with a two-page template that takes eleven minutes to fill in and is linked from the place the work happens.",
        "The template asks for the decision, the options considered, the evidence, the owner and the review date. That is it. It is deliberately shorter than the conversation it replaces, because the point is to record the decision, not to relitigate it.",
        "Six months in, the archive does more work than the decisions did. New joiners read four of them in their first week and stop asking why the roadmap looks the way it does. The cost is a small amount of writing. The return is a company that remembers.",
      ],
    },
    {
      slug: "calmer-weekly-review",
      title: "A calmer weekly review, in four steps",
      category: "Company",
      excerpt:
        "The meeting that used to run ninety minutes now runs thirty, and it starts with a report nobody had to write.",
      publishedAt: "2026-08-18",
      readTime: 6,
      image: {
        src: "./assets/img/blog-review.jpg",
        alt: "A notebook, fountain pen and linen folder on a pale stone desk beside a window",
      },
      author: { name: "Sara Haugland", role: "Customer Success" },
      featured: false,
      body: [
        "Our weekly review used to begin with twelve people reading a document in silence. We changed three things and cut the meeting in half: the report arrives the evening before, the first ten minutes are for written comments only, and the agenda is ordered by what changed rather than by team.",
        "The structure is simple. Two minutes on the numbers, five on the customer signals, ten on the decisions that are blocked, and the rest on owners and dates. Anything that needs a longer conversation leaves the room as a separate meeting with a named driver.",
        "The unexpected benefit is tone. When the numbers arrive early, nobody performs surprise. The conversation moves from defending last week to choosing next week, which is the only thing the meeting was ever for.",
      ],
    },
  ];

  const integrations = [
    // TODO: confirm the real integration list and short descriptions
    { slug: "slack", name: "Slack", mark: "SL", category: "Communication", description: "Deliver reports and alerts into any channel.", connected: true },
    { slug: "microsoft-teams", name: "Microsoft Teams", mark: "MT", category: "Communication", description: "Post weekly summaries where your team talks.", connected: false },
    { slug: "zoom", name: "Zoom", mark: "ZM", category: "Communication", description: "Attach meeting context to the work it created.", connected: false },
    { slug: "github", name: "GitHub", mark: "GH", category: "Development", description: "Turn pull requests and reviews into delivery metrics.", connected: true },
    { slug: "gitlab", name: "GitLab", mark: "GL", category: "Development", description: "Track merge requests across every repository.", connected: false },
    { slug: "linear", name: "Linear", mark: "LN", category: "Development", description: "Sync cycles, issues and project health.", connected: true },
    { slug: "jira", name: "Jira", mark: "JR", category: "Development", description: "Import epics and sprints without a CSV.", connected: false },
    { slug: "figma", name: "Figma", mark: "FG", category: "Design", description: "See design activity alongside delivery.", connected: false },
    { slug: "notion", name: "Notion", mark: "NO", category: "Knowledge", description: "Link decisions and specs to the metrics they moved.", connected: false },
    { slug: "google-drive", name: "Google Drive", mark: "GD", category: "Knowledge", description: "Index documents and keep sources attached.", connected: false },
    { slug: "stripe", name: "Stripe", mark: "ST", category: "Finance", description: "Bring revenue and churn into one view.", connected: false },
    { slug: "salesforce", name: "Salesforce", mark: "SF", category: "Finance", description: "Connect pipeline health to product usage.", connected: false },
    { slug: "bigquery", name: "BigQuery", mark: "BQ", category: "Analytics", description: "Query your warehouse directly from a dashboard.", connected: false },
    { slug: "looker", name: "Looker", mark: "LK", category: "Analytics", description: "Reuse existing Looker explores and looks.", connected: false },
  ];

  const testimonials = [
    // TODO: replace with real, attributable customer quotes
    {
      quote:
        "We replaced three spreadsheets and a weekly meeting with one Rossell dashboard. The first month paid for the year.",
      name: "Amara Diallo",
      role: "VP Operations",
      company: "Northwind",
    },
    {
      quote:
        "Our engineers stopped writing status reports. Rossell writes them from the work itself, and they are more accurate than ours were.",
      name: "Jonas Weber",
      role: "Engineering Director",
      company: "Kestrel",
    },
    {
      quote:
        "The analytics finally match how we talk about the business. One number, one definition, everywhere.",
      name: "Hana Kobayashi",
      role: "Head of Finance",
      company: "Aperture",
    },
  ];

  const faqs = [
    {
      question: "How long does setup take?",
      answer:
        "Most teams are live in under ten minutes. Connect two tools, pick the metrics you already track, and Rossell builds the first dashboard for you. Importing historical data from a spreadsheet is optional and takes a few more minutes.",
    },
    {
      question: "Do I need an engineer to run this?",
      answer:
        "No. The setup flow, dashboards and report templates are built for people who own the work, not for a data team. If you do have engineers, they can use the API and the warehouse connection for anything custom.",
    },
    {
      question: "Where is my data stored?",
      answer:
        "Data is encrypted in transit and at rest, and you choose an EU or US region when the workspace is created. Single sign-on, audit logs and role-based access are included on every plan.",
    },
    {
      question: "Can I keep the tools we already use?",
      answer:
        "That is the point. Rossell sits on top of your existing stack and reads from it, so nobody has to change the way they work. There are 120+ connectors, and requests for new ones are usually shipped within a few weeks.",
    },
    {
      question: "What happens after the free trial?",
      answer:
        "Nothing automatic. On day 14 you choose a plan or export your data and leave. No card is required to start, and we never charge a workspace that has not picked a plan.",
    },
  ];

  const contact = {
    email: "hello@rossell.com", // TODO: real inbox
    phone: "+31 20 123 4567", // TODO: real number
    address: "Herengracht 182, 1016 BR Amsterdam", // TODO: real address
    hours: "Monday to Friday, 09:00 to 18:00 CET",
    responseTime: "We reply within one business day.",
  };

  const legal = {
    privacy: {
      title: "Privacy policy",
      body: [
        "TODO: replace this placeholder with the reviewed privacy policy before launch.",
        "Rossell collects only the information needed to operate the workspace: account details, workspace activity, and the data you choose to connect from your tools. Data is encrypted in transit and at rest.",
        "You can request an export or deletion of your workspace data at any time by writing to hello@rossell.com.",
      ],
    },
    terms: {
      title: "Terms of service",
      body: [
        "TODO: replace this placeholder with the reviewed terms of service before launch.",
        "The workspace is provided as-is during the trial period. Paid plans include the service levels described in your order form.",
        "You are responsible for the accounts and integrations you connect, and for keeping your credentials secure.",
      ],
    },
    cookies: {
      title: "Cookie policy",
      body: [
        "TODO: replace this placeholder with the reviewed cookie policy before launch.",
        "The marketing site stores two local preferences in your browser: the selected colour theme and the integrations you have switched on in the demo. No third-party advertising cookies are set.",
        "Server logs are retained for 30 days for security and debugging purposes.",
      ],
    },
  };

  return {
    brand: "Rossell",
    tagline: "Workspace intelligence",
    stats: stats,
    trustedBy: trustedBy,
    metrics: metrics,
    channels: channels,
    posts: posts,
    integrations: integrations,
    testimonials: testimonials,
    faqs: faqs,
    contact: contact,
    legal: legal,
  };
});
