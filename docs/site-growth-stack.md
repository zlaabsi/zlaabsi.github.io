# Site Growth Stack

This repo now has a lightweight growth stack scaffold for:

- email notifications for new articles and meaningful revisions
- visitor and page analytics
- article click tracking
- heatmaps and session recordings

## Chosen stack

- `Buttondown` for email subscriptions
- `Plausible` for traffic metrics and custom click events
- `Microsoft Clarity` for heatmaps and session recordings

The implementation is config-driven. The updates feed and newsletter surfaces can go live before every external service is connected; the email form and Clarity still need their service-side IDs.

## Files

- `hugo.yaml`
- `layouts/index.updates.xml`
- `layouts/partials/extend_head.html`
- `layouts/partials/extend_footer.html`
- `layouts/partials/newsletter_cta.html`
- `layouts/shortcodes/newsletter.html`
- `layouts/_default/single.html`
- `content/subscribe.md`
- `assets/css/extended/theme.css`

## Emailing

Use the dedicated feed at `/updates.xml` for newsletter automation.

Why a separate feed:

- the default site RSS is not a good trigger for mailing logic
- update emails should be intentional, not tied to every typo fix

The updates feed uses this rule:

- a post is `new` by default
- a post becomes `updated` only when you add `notify_lastmod` in its front matter

Example:

```yaml
notify_lastmod: 2026-04-11
```

If you publish that change, `/updates.xml` emits a fresh item for the revised essay, so your email provider can notify subscribers again.

## Config to fill in

In `hugo.yaml`:

```yaml
params:
  integrations:
    newsletter:
      enabled: true
      buttondown:
        username: "YOUR_BUTTONDOWN_USERNAME"
    analytics:
      plausible:
        enabled: true
      clarity:
        enabled: true
        projectId: "YOUR_CLARITY_PROJECT_ID"
```

Current repo state:

- newsletter UI is enabled site-side
- `/subscribe/` is linked in the top nav
- `/updates.xml` is live and intended for notification automation
- Plausible script is enabled for production builds
- Buttondown username is still missing
- Clarity project ID is still missing

## Suggested setup flow

1. Create a Buttondown newsletter and point its RSS automation at `/updates.xml`.
2. Create a Plausible site for `zlaabsi.github.io`.
3. Create a Clarity project for the same domain.
4. Fill the IDs in `hugo.yaml`.
5. Deploy.

## What gets tracked

- daily visitors and pageviews via Plausible
- clicks into `/posts/*` links via Plausible custom events
- newsletter form submissions via Plausible custom events
- heatmaps and recordings via Clarity

## Remaining manual work

- decide on the final Buttondown username
- add a public privacy page once the services are live
