# GTM production configuration contract

Application code does not edit or publish the live GTM container. Test the workspace in GTM Preview before publishing.

## Main Google Tag

- Name: `GA4 | Google Tag | Production`
- Tag ID: `G-W7WJF6YR9X`
- Configuration: `send_page_view = false`
- Trigger: `INIT | Production Public Pages`
- Trigger conditions:
  - Page Hostname equals `ahmedaziz-portfolio.vercel.app`
  - Page Path does not match RegEx `^/(admin|auth|api)(/|$)`

Consent settings:

- Use built-in Google consent checks.
- Select **No additional consent required** for the main Google Tag.
- Do not require advertising consent and do not set consent values in this tag.
- Every GA4 event tag must require `analytics_storage`.

Map `virtual_page_view` to GA4 `page_view`, keep `send_page_view` and
browser-history page views disabled, and map controlled application events as
documented in `docs/ANALYTICS_SETUP.md`. The
`analytics_consent_updated` diagnostic event must not be forwarded as a GA4
event. Clarity must not be installed in GTM. The noscript iframe is deliberately
omitted because it cannot participate reliably in this JavaScript consent
interaction.
