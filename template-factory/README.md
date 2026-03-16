# Template Factory — Multi-Agent Income Generator

A three-agent system that discovers, builds, and distributes developer starter templates to generate residual income on marketplaces like Gumroad and Lemonsqueezy.

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  🔍 Scout   │ ──► │  🔨 Builder │ ──► │  📢 Distributor  │
│             │     │             │     │                  │
│ Finds high- │     │ Generates a │     │ Creates listings,│
│ demand,     │     │ complete,   │     │ pricing, social  │
│ low-comp    │     │ production- │     │ media posts, SEO │
│ template    │     │ ready       │     │ keywords, launch │
│ ideas       │     │ template    │     │ email copy       │
└─────────────┘     └─────────────┘     └──────────────────┘
```

## Quick Start

```bash
cd template-factory
npm install
cp .env.example .env    # Add your ANTHROPIC_API_KEY

# Run the full pipeline
npm run pipeline

# Or run each agent individually
npm run scout                          # Find opportunities
npm run build-template                 # Build template #0 from scout report
npm run distribute                     # Generate listings for template #0
```

## Commands

| Command | Description |
|---|---|
| `npm run scout` | Analyze market trends, output 5 ranked template ideas |
| `npm run build-template` | Generate a complete template from the scout report |
| `npm run distribute` | Create marketplace listings, pricing, and launch content |
| `npm run pipeline` | Run all three agents end-to-end |

### Options

```bash
# Focus scouting on a specific area
npm start -- scout --focus "AI tools"

# Build a specific idea (by index) from the scout report
npm start -- build --index 2

# Run full pipeline with focus
npm start -- pipeline --focus "Next.js SaaS"
```

## Output Structure

```
output/
├── scout-report.json              # All discovered template ideas
├── my-template-slug/
│   ├── src/...                    # Generated template source files
│   ├── README.md                  # Template's own README
│   ├── package.json               # Template's package.json
│   ├── build-manifest.json        # Build metadata
│   └── distribution-plan.json     # Marketplace listings & marketing copy
└── my-template-slug.zip           # Ready-to-upload archive
```

## The Income Math

| Templates | Price | Monthly Sales Each | Monthly Revenue |
|---|---|---|---|
| 3 | $19 | 5 | $285 |
| 5 | $29 | 4 | $580 |
| 5 | $29 | 7 | $1,015 |

Target: 4-5 templates selling 5+ copies/month each = Claude Max covered.

## Workflow

1. **Scout** — Run weekly to find new opportunities
2. **Build** — Generate the template, then spend 1-2 hours polishing
3. **Distribute** — Use the generated listings to post on Gumroad/Lemonsqueezy
4. **Promote** — Post the generated social content on Twitter/Reddit/HN
5. **Repeat** — Each new template compounds your passive income

## Requirements

- Node.js 18+
- Anthropic API key (`ANTHROPIC_API_KEY`)
