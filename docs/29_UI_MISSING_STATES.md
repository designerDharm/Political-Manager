# UI Non-Happy & Missing States Specification — CampaignOps AI

Every user interface screen and interactive widget in CampaignOps AI must support comprehensive non-happy states built using the established design system tokens (Dark Navy `#0B132B`, Primary Blue `#2563EB`, Surface `#F8FAFC`).

---

## 1. Supported Non-Happy State Matrix

| State Type | Visual Treatment & Behavior | Actions Offered |
|---|---|---|
| **Loading & Skeleton** | Pulsing gray skeletons matching exact card/table geometry; disable inputs and show spinner for mutations. | None (transient state) |
| **Empty State** | Centered clean SVG icon with soft background circle (e.g. blue or amber), clear descriptive message. | Primary action button (e.g. `Upload Voter List`, `Create Campaign`, `Add Issue`). |
| **No Search Results** | Search icon with magnifying glass, text: "No matches found for '<query>'". | `Clear Filters`, `Reset Search`. |
| **403 Forbidden / No Permission** | Shield alert icon, explanation that user's role or geographic scope restricts access. | `Request Authorization`, `Return to Assigned Area`. |
| **404 Not Found** | Clean broken link illustration with clear route context. | `Go to Dashboard`. |
| **Offline Mode (Agent PWA)** | Sticky top amber/slate banner: "Offline — mutations queued in local encrypted storage". | `Review Queued Changes`, `Retry Connection`. |
| **Sync Conflict** | Two-column side-by-side comparison modal showing Server Version vs Local Mutation. | `Keep Server`, `Review Differences`, `Submit for Admin Arbitration`. |
| **AI Provider Unavailable** | Informational banner: "AI Engine in fallback mode. Standard rule-based normalization active." | `Retry Extraction`, `Continue with Manual Review`. |
| **Geographic Boundary Missing** | Map panel fallback showing centroid marker or ward list instead of broken blank canvas. | `Import Boundary GeoJSON`, `Switch to Tabular View`. |
| **Maker-Checker Pending** | Amber badge on record: "Pending Dual-Authorization. Awaiting approval from authorized manager." | `View Request Details`, `Withdraw Request`. |
