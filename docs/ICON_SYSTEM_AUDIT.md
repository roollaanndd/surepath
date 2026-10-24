# SurePath Icon System — Admin Audit & Asset Coverage

Status: implementation notes for the Admin Icon Manager and shared portal icons.

## Findings from the current implementation

1. `PortalIconManager` has 48 managed IDs, four SVG styles (Studio, Orbit, Bold, Illustrative), upload overrides, and a 12-item sketch PNG library.
2. `services/portalIcons.ts` persists custom icon URLs and style choices in the CMS `app_icons` section. This means a custom upload is shared configuration, not an isolated preview.
3. `SurePathIcon.tsx` chooses artwork through ordered substring matching. Similar words can collide: for example `policy_orders` can hit policy/document branches while `quotes`, `new`, and `submissions` can accidentally reuse one drawing despite different meanings.
4. `ManagedPortalIcon.tsx` previously rendered an uploaded image with no image-error fallback. A stale/deleted storage URL could leave a blank icon.
5. The sketch library crops a 4x3 sprite to 12 icons; it is a starter library, not complete coverage for all 48 managed IDs.

## Fix applied in this branch

- Added an explicit managed-ID-to-artwork map for all 48 Icon Manager IDs, so fallback artwork selection is semantic rather than inferred from substrings.
- Added broken custom-image handling: when an uploaded URL fails, the component falls back to the built-in SVG artwork. Upload keys remain unchanged so existing CMS configuration stays compatible.
- Reset the failed-image state when an admin changes the configured URL, allowing a newly uploaded icon to display normally.

## Canonical managed icon inventory

| Group | IDs |
|---|---|
| Navigation | home, dashboard, policy, quotes, profile, notifications |
| Relations | clients, users, agents, insurers, b2b, user_mgmt |
| Operations | claims, claims_admin, approvals, payments, withdraw, withdrawals, transactions, activity_log |
| Finance | commission, commission_ledger, financial, analytics, reports, inventory |
| Products & content | documents, product_config, policy_orders, endorsements, vehicle_pricelist, ojk_rates, website_editor, tier_promo |
| AI & system | pathy, ai_admin, ai_finance, pathy_logs, ops_console, security, settings, system |
| Insurance products | product, car_protection, travel_safe, personal_safety, item_shield, family_health |

## Asset direction

- Brand palette: SurePath emerald/green, mint and lime; orange is a restrained accent, not a competing primary color.
- Use SVG for core navigation and functional icons: crisp at all sizes, small payload, and accessible fallback.
- Use transparent PNG/WebP only for richer character/illustration artwork; avoid putting text in icons.
- Keep the official SurePath logo as the supplied original asset. Do not redraw or approximate the logo.
- Each navigation concept should have a distinguishable silhouette at 20–28 px. Decorative details must not obscure recognition at small sizes.
- Maintain light/dark preview, 1x/2x rendering checks, upload validation, explicit save/error state, and reset-to-default.

## Verification checklist before production

- [ ] TypeScript and ESLint pass.
- [ ] Broken custom icon URL falls back to built-in SVG in every portal.
- [ ] Admin preview matches customer, agent, operator, insurer and B2B navigation usage.
- [ ] Upload, change style, and reset survive refresh (CMS persistence).
- [ ] Mobile navigation checked at 20–24 px; desktop sidebar checked at 24–28 px.
- [ ] Test storage permissions and confirm image URLs are public/signed as intended.
- [ ] Verify PWA cache/update behavior after icon changes.

## Important limitation

The mapping and fallback patch improves all current managed IDs, but it does not magically create 48 unique custom raster illustrations. The current SVG artwork library still has a smaller set of base compositions. New unique illustrations should be added deliberately and reviewed at actual navigation size before replacing existing artwork.
