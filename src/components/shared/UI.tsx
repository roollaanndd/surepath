
import React from 'react';

// Common Section Wrapper to ensure consistent padding and max-width
// Fix: Added React.FC typing and made children optional to resolve TS errors in consuming components
export const Section: React.FC<{ children?: React.ReactNode, id?: string, className?: string }> = ({ children, id, className = "" }) => (
  <section id={id} className={`py-32 px-6 md:px-12 lg:px-20 ${className}`}>
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  </section>
);

// Consistent Badge for category/labels
// Fix: Added React.FC typing and made children optional to resolve TS errors in consuming components
export const Badge: React.FC<{ children?: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/10 rounded-full border border-brand-500/20 shadow-sm ${className}`}>
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
      {children}
    </span>
  </div>
);

// Highly reusable Button component
// Fix: Added React.FC typing and made children optional to resolve TS errors in consuming components
export const Button: React.FC<{ 
  children?: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost',
  size?: 'sm' | 'md' | 'lg' | 'xl',
  icon?: any,
  onClick?: () => void,
  className?: string
}> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  onClick,
  className = ""
}) => {
  const variants = {
    primary: "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02] active:scale-[0.98] shadow-xl",
    secondary: "bg-brand-500 text-white hover:bg-brand-600 shadow-brand-500/20",
    outline: "bg-transparent border-2 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:border-brand-500",
    ghost: "bg-transparent text-slate-500 hover:text-brand-500"
  };

  const sizes = {
    sm: "px-6 py-2.5 text-[10px]",
    md: "px-8 py-3.5 text-xs",
    lg: "px-10 py-5 text-sm",
    xl: "px-12 py-6 text-base"
  };

  return (
    <button 
      onClick={onClick}
      className={`rounded-full font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
      {Icon && <Icon size={18} />}
    </button>
  );
};

// Reusable Card for products or features
// Fix: Added React.FC typing and made children optional to resolve TS errors in consuming components
export const GlassCard: React.FC<{ children?: React.ReactNode, onClick?: () => void, className?: string }> = ({ children, onClick, className = "" }) => (
  <div 
    onClick={onClick}
    className={`group p-10 bg-white dark:bg-white/[0.02] rounded-[3.5rem] border border-black/5 dark:border-white/5 hover:border-brand-500 transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </div>
);
