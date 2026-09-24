'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { COOKIE_CONSENT_EVENT, hasAnalyticsConsent } from '@/lib/cookie-consent';

export function MarketingPixels() {
  const [allowed, setAllowed] = useState(false);
  const gtm = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  const ads = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();
  const meta = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();

  useEffect(() => {
    const sync = () => setAllowed(hasAnalyticsConsent());
    sync();
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
  }, []);

  if (!allowed) return null;

  return (
    <>
      {gtm ? (
        <Script id="gtm" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':Date.now(),event:'gtm.js'});
          var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      ) : null}
      {ads && !gtm ? (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${ads}`}
          strategy="afterInteractive"
        />
      ) : null}
      {ads && !gtm ? (
        <Script id="google-ads" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date()); gtag('config', '${ads}');`}
        </Script>
      ) : null}
      {meta ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
          (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${meta}');fbq('track','PageView');`}
        </Script>
      ) : null}
    </>
  );
}
