import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Omni Group Tech — custom software and AI automation';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '76px 84px',
          background: '#09090b',
          color: '#fafafa',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 54,
              height: 54,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #a1a1aa',
              borderRadius: 12,
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            O
          </div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Omni Group Tech</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 930 }}>
          <div style={{ fontSize: 70, lineHeight: 1.05, fontWeight: 700 }}>
            Software and AI automation built for real business
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.35, color: '#d4d4d8' }}>
            Transparent packages, production delivery, and ongoing support.
          </div>
        </div>
        <div style={{ fontSize: 22, color: '#a1a1aa' }}>omnigrouptech.com</div>
      </div>
    ),
    size,
  );
}
