import React from 'react';

const IconWrapper = ({ children, className, color = "currentColor", size, strokeWidth = 2 }: { children: React.ReactNode, className?: string, color?: string, size?: number, strokeWidth?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    className={className ?? (size ? undefined : 'w-6 h-6')} width={size} height={size}>
    {children}
  </svg>
);

// Custom Icons that correlate with the Mascot (Rounded chassis, antenna-like details, circular eye motifs)
export const BotShield = (props: any) => (
  <IconWrapper {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <circle cx="12" cy="11" r="3" fill="none" strokeWidth="1.5" />
    <circle cx="10.5" cy="11" r="0.5" fill="currentColor" />
    <circle cx="13.5" cy="11" r="0.5" fill="currentColor" />
  </IconWrapper>
);

export const BotCar = (props: any) => (
  <IconWrapper {...props}>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 13.1V16c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
    <path d="M12 7V5M12 5l-2-2M12 5l2-2" strokeWidth="1" opacity="0.6" /> {/* Antenna */}
    <circle cx="8" cy="12" r="1" fill="currentColor" />
    <circle cx="11" cy="12" r="1" fill="currentColor" />
  </IconWrapper>
);

export const BotPlane = (props: any) => (
  <IconWrapper {...props}>
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    <circle cx="14" cy="9" r="1" fill="currentColor" />
    <circle cx="16" cy="9" r="1" fill="currentColor" />
  </IconWrapper>
);

export const BotHeart = (props: any) => (
  <IconWrapper {...props}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <circle cx="9.5" cy="8.5" r="0.8" fill="currentColor" />
    <circle cx="14.5" cy="8.5" r="0.8" fill="currentColor" />
    <path d="M10 11.5q2 1.5 4 0" strokeWidth="1" />
  </IconWrapper>
);

export const BotBox = (props: any) => (
  <IconWrapper {...props}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
    <circle cx="10" cy="8" r="0.5" fill="currentColor" />
    <circle cx="14" cy="8" r="0.5" fill="currentColor" />
    <path d="M12 4V2" strokeWidth="1" opacity="0.4" />
  </IconWrapper>
);
export const BotWallet = (props: any) => (
  <IconWrapper {...props}>
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    <circle cx="9" cy="13" r="0.7" fill="currentColor" />
    <circle cx="12" cy="13" r="0.7" fill="currentColor" />
    <path d="M9.5 16q1.5 1 3 0" strokeWidth="1" />
  </IconWrapper>
);

export const BotCoin = (props: any) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3V1M12 1l-1.5-.5M12 1l1.5-.5" strokeWidth="1" opacity="0.5" />
    <path d="M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" strokeWidth="1.6" />
    <path d="M12 8v1.5M12 15.5V17" strokeWidth="1.6" />
    <circle cx="9" cy="7" r="0.6" fill="currentColor" />
    <circle cx="15" cy="7" r="0.6" fill="currentColor" />
  </IconWrapper>
);

export const BotPolicy = (props: any) => (
  <IconWrapper {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h5" strokeWidth="1.4" />
    <circle cx="10" cy="10" r="0.6" fill="currentColor" />
    <circle cx="13" cy="10" r="0.6" fill="currentColor" />
  </IconWrapper>
);

export const BotClaimCam = (props: any) => (
  <IconWrapper {...props}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="4" />
    <circle cx="10.7" cy="12.5" r="0.6" fill="currentColor" />
    <circle cx="13.3" cy="12.5" r="0.6" fill="currentColor" />
    <path d="M10.8 14.6q1.2 1 2.4 0" strokeWidth="1" />
    <path d="M12 4V2" strokeWidth="1" opacity="0.4" />
  </IconWrapper>
);

export const BotAgent = (props: any) => (
  <IconWrapper {...props}>
    <path d="M4 14v-3a8 8 0 0 1 16 0v3" />
    <path d="M2 14a2 2 0 0 1 2-2v6a2 2 0 0 1-2-2v-2ZM22 14a2 2 0 0 0-2-2v6a2 2 0 0 0 2-2v-2Z" />
    <path d="M20 18a4 4 0 0 1-4 4h-2" strokeWidth="1.4" />
    <circle cx="10" cy="12" r="0.7" fill="currentColor" />
    <circle cx="14" cy="12" r="0.7" fill="currentColor" />
    <path d="M10 15q2 1.4 4 0" strokeWidth="1" />
  </IconWrapper>
);

export const BotHome = (props: any) => (
  <IconWrapper {...props}>
    <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    <path d="M12 3V1.5" strokeWidth="1" opacity="0.4" />
    <circle cx="10" cy="12" r="0.7" fill="currentColor" />
    <circle cx="14" cy="12" r="0.7" fill="currentColor" />
    <path d="M10 15q2 1.4 4 0" strokeWidth="1" />
  </IconWrapper>
);

export const BotChart = (props: any) => (
  <IconWrapper {...props}>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M7 15l4-5 3 3 5-6" strokeWidth="1.8" />
    <circle cx="7" cy="15" r="0.8" fill="currentColor" />
    <circle cx="19" cy="7" r="0.8" fill="currentColor" />
  </IconWrapper>
);

export const BotUser = (props: any) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="8" r="4.5" />
    <path d="M4.5 21c1.2-4.2 4.2-6.5 7.5-6.5s6.3 2.3 7.5 6.5" />
    <circle cx="10.4" cy="7.6" r="0.6" fill="currentColor" />
    <circle cx="13.6" cy="7.6" r="0.6" fill="currentColor" />
    <path d="M10.6 9.8q1.4 1 2.8 0" strokeWidth="1" />
    <path d="M12 3.5V2" strokeWidth="1" opacity="0.4" />
  </IconWrapper>
);
