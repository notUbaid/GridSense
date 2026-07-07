import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#c026d3', // Matches primary brand color roughly
          backgroundImage: 'linear-gradient(to bottom right, #facc15, #ca8a04)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'black',
          borderRadius: '20%',
          fontWeight: 800,
          boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.2)',
        }}
      >
        GS
      </div>
    ),
    { ...size }
  )
}
