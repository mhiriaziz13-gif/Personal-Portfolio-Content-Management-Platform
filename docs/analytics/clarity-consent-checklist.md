# Microsoft Clarity consent checklist

The application loads Clarity only after granted analytics consent, only on the production hostname and only on public paths. It sends Consent API V2 with `ad_Storage: denied` and the selected `analytics_Storage` state. It does not use Identify or send application identity data. Sensitive public and private forms are masked, and Clarity is not configured through GTM.

Manual dashboard check still required:

1. Open Clarity → Settings → Setup.
2. Confirm Consent Mode is enabled.
3. Confirm cookies are disabled by default where applicable.
4. Confirm there is no second installation through GTM.
5. Validate one initialization after acceptance and denied Consent V2 after
   revocation.
6. Confirm the withdrawal reload removes the loaded collector and `_clck` /
   `_clsk` cookies before browsing continues.

These external dashboard settings were not changed by this implementation.
