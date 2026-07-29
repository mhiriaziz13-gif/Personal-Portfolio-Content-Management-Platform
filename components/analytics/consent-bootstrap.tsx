/* eslint-disable @next/next/no-before-interactive-script-outside-document -- Rendered only from app/layout.tsx so consent queues before the interactive GTM loader. */
import Script from "next/script";

export const ConsentBootstrap = ({ enabled }: { enabled: boolean }) => {
  if (!enabled) return null;

  return (
    <Script id="analytics-consent-bootstrap" strategy="beforeInteractive">
      {`window.dataLayer=window.dataLayer||[];
window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
var analyticsStorage='denied';
try{var isPublicAnalyticsPath=!/^\\/(?:admin|auth|api)(?:\\/|$)/.test(window.location.pathname);var rawConsent=window.localStorage.getItem('aam_analytics_consent_v1');if(!rawConsent){var legacyConsent=window.localStorage.getItem('aam_analytics_consent');if(legacyConsent==='granted'||legacyConsent==='denied'){rawConsent=JSON.stringify({version:1,analytics:legacyConsent,updatedAt:new Date().toISOString()});window.localStorage.setItem('aam_analytics_consent_v1',rawConsent);window.localStorage.removeItem('aam_analytics_consent');}}if(rawConsent&&isPublicAnalyticsPath){var parsedConsent=JSON.parse(rawConsent);if(parsedConsent&&parsedConsent.version===1&&parsedConsent.analytics==='granted'&&typeof parsedConsent.updatedAt==='string'&&!Number.isNaN(Date.parse(parsedConsent.updatedAt))){analyticsStorage='granted';}}}catch(error){analyticsStorage='denied';}
window.gtag('consent','default',{analytics_storage:analyticsStorage,ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});`}
    </Script>
  );
};
