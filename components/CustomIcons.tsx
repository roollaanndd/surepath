import React from 'react';

const IconWrapper = ({ children, className = "w-6 h-6", color = "currentColor" }: { children: React.ReactNode, className?: string, color?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
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