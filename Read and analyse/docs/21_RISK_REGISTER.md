# Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| OCR errors | Wrong voter records | confidence + review + source snapshot |
| Incorrect household grouping | Field confusion | suggestion-only + human correction |
| Cross-tenant data leak | Critical | scoped queries + RLS defense + tests |
| Agent device lost | High | short sessions + remote revoke + minimal local cache |
| Offline conflict | Medium/High | base versions + conflict review |
| AI provider outage | Medium | queue retry + provider abstraction + manual fallback |
| Election-day load spike | High | load test + autoscale + prewarm |
| Public file exposure | Critical | private object storage + signed URLs |
| Unauthorized export | High | RBAC + audit + encryption + expiry |
| Backup unusable | Critical | restore drills |
| Prompt injection in PDF | High | extraction sandbox + no tools + schema validation |
| Overcollection | High | data minimization + retention rules |
| Political preference inference | High | product guardrail + schema prohibition + tests |
| Misinterpretation of VIS | High | explicit event semantics + UI labels |
| Legal/regulatory change | High | configurable policies + counsel review |
| Vendor lock-in | Medium | adapters + portable data model |
