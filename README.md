# RISC-V Technical Committees Explorer

A React-based viewer for RISC-V Technical Committees, providing table, graph, and statistics views of Task Groups, Special Interest Groups, Horizontal Committees, and Governing Committees.

## Features

- **Table View**: Searchable, grouped table of all technical committees
- **Graph View**: Interactive D3.js force-directed graph showing organizational hierarchy
- **Statistics View**: Company positions, upcoming elections, groups approaching 2 years, and longest running committees
- **Email Integration**: Quick mailto links to contact chairs and vice-chairs
- **Responsive Design**: Works on desktop and mobile devices
- **RISC-V Branding**: Uses official California Gold and Berkeley Blue color scheme

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Python 3.8+ (for data fetching)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Development with emails visible

```bash
VITE_SHOW_EMAILS=true npm run dev
```

### Build

```bash
npm run build
```

### Build with emails visible

```bash
VITE_SHOW_EMAILS=true npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Data Update

To update the committee data, run the Python script:

```bash
# Set environment variables
export JIRA_USER_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-api-token"

# Run the script
python get-rvg-issues.py --output grouped-csv --save public/rvg-grouped.csv
```

### Environment Variables

**For the Python script:**

| Variable | Description | Required |
|----------|-------------|----------|
| `JIRA_USER_EMAIL` | Your Jira account email | Yes |
| `JIRA_API_TOKEN` | Your Jira API token | Yes |
| `JIRA_SERVER_URL` | Jira server URL (default: https://riscv.atlassian.net) | No |

**For the React app:**

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SHOW_EMAILS` | Show email addresses and action column | `false` |

## Deployment

The project includes a GitHub Actions workflow that:
- Runs twice daily (6:00 AM and 6:00 PM UTC) to fetch fresh data from Jira
- Automatically commits updated CSV data
- Builds and deploys to GitHub Pages

### GitHub Secrets Required

Add these secrets to your repository (Settings → Secrets and variables → Actions):

- `JIRA_USER_EMAIL` - Your Jira account email
- `JIRA_API_TOKEN` - Your Jira API token

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- D3.js
- Python (for Jira data fetching)

## Color Scheme

- **Berkeley Blue**: #003262
- **California Gold**: #FDB515
- **Berkeley Blue Light**: #3B7EA1
- **Berkeley Blue Dark**: #00213E

## Contributors

- **Rafael Sene** - Initial contributor - rafael@riscv.org

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

Copyright 2024 RISC-V International
