import React from 'react';

export const Section: React.FC<{ children?: React.ReactNode, id?: string, className?: string }> = ({ children, id, className = "" }) => (
  <section id={id} className={`py-32 px-6 md:px-12 lg:px-20 ${className}`}>
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  </section>
);

export const Badge: React.FC<{ children?: React.ReactNode, className?: string, variant?: 'success' | 'info' | 'warning' | 'brand' }> = ({ children, className = "", variant = 'brand' }) => {
  const styles = {
    brand: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    info: "bg-blue-50 text-blue-600 border-blue-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100"
  };
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${styles[variant]} ${className}`}>
      {children}
    </div>
  );
};

export const Button: React.FC<{ 
  children?: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'brand',
  size?: 'sm' | 'md' | 'lg' | 'xl',
  icon?: any,
  onClick?: () => void,
  className?: string,
  disabled?: boolean
}> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  onClick,
  className = "",
  disabled = false
}) => {
  const variants = {
    primary: "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 shadow-xl",
    brand: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-600/20",
    secondary: "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50",
    outline: "bg-transparent border-2 border-slate-200 text-slate-900 dark:text-white hover:border-emerald-500 hover:text-emerald-600",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100"
  };

  const sizes = {
    sm: "px-6 py-2.5 text-[10px] font-bold",
    md: "px-8 py-3.5 text-xs font-bold",
    lg: "px-10 py-5 text-sm font-black tracking-widest",
    xl: "px-12 py-6 text-base font-black tracking-widest"
  };

  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 uppercase ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
      {Icon && <Icon size={18} strokeWidth={2.5} />}
    </button>
  );
};

export const GlassCard: React.FC<{ children?: React.ReactNode, onClick?: () => void, className?: string }> = ({ children, onClick, className = "" }) => (
  <div 
    onClick={onClick}
    className={`group p-10 bg-white dark:bg-white/[0.02] rounded-[3.5rem] border border-black/5 dark:border-white/5 hover:border-emerald-500 transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </div>
);