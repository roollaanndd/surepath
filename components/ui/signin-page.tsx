import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, LucideIcon } from "lucide-react";

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

interface CardProps { children: React.ReactNode; className?: string }
const Card = ({ children, className = "" }: CardProps) => (
  <div className={`bg-card border border-border rounded-lg ${className}`}>{children}</div>
);

interface FormHeaderProps { title: string; subtitle: string }
const FormHeader = ({ title, subtitle }: FormHeaderProps) => (
  <div className="text-center space-y-2">
    <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
    <p className="text-muted-foreground">{subtitle}</p>
  </div>
);

interface InputFieldProps {
  id: string; type: string; label: string; placeholder: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: LucideIcon; required?: boolean; className?: string;
}
const InputField = ({ id, type, label, placeholder, value, onChange, icon: Icon, required = false, className = "" }: InputFieldProps) => (
  <div className="space-y-2">
    <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        id={id} type={type} placeholder={placeholder} value={value} onChange={onChange} required={required}
        className={`w-full h-11 pl-10 pr-3 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all duration-300 ${className}`}
      />
    </div>
  </div>
);

interface PasswordFieldProps {
  id: string; label: string; placeholder: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPassword: boolean; onTogglePassword: () => void; required?: boolean;
}
const PasswordField = ({ id, label, placeholder, value, onChange, showPassword, onTogglePassword, required = false }: PasswordFieldProps) => (
  <div className="space-y-2">
    <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        id={id} type={showPassword ? "text" : "password"} placeholder={placeholder} value={value}
        onChange={onChange} required={required}
        className="w-full h-11 pl-10 pr-10 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all duration-300"
      />
      <button type="button" onClick={onTogglePassword}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-300"
        aria-label={showPassword ? "Hide password" : "Show password"}>
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
);

interface ButtonProps {
  type?: "button" | "submit" | "reset"; variant?: "primary" | "outline";
  onClick?: () => void; children: React.ReactNode; className?: string; fullWidth?: boolean;
}
const Button = ({ type = "button", variant = "primary", onClick, children, className = "", fullWidth = false }: ButtonProps) => {
  const base = "h-11 rounded-md font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background flex items-center justify-center gap-2"
  const variants = {
    primary: "bg-primary text-primary-foreground shadow-lg hover:opacity-90",
    outline: "border border-border bg-background hover:bg-secondary text-foreground",
  }
  return (
    <button type={type} onClick={onClick}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}>
      {children}
    </button>
  )
}

const Divider = ({ text }: { text: string }) => (
  <div className="relative">
    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
    <div className="relative flex justify-center text-xs uppercase">
      <span className="bg-card px-2 text-muted-foreground">{text}</span>
    </div>
  </div>
)

const AnimatedBlob = ({ color, position, delay = "" }: { color: string; position: string; delay?: string }) => (
  <div className={`absolute ${position} w-72 h-72 ${color} rounded-full mix-blend-screen filter blur-xl opacity-70 animate-blob ${delay}`} />
)

const GradientWave = () => (
  <div className="absolute inset-0 opacity-20">
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1440 560">
      <defs>
        <linearGradient id="sp-signin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <path fill="url(#sp-signin-grad)" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,186.7C1248,181,1344,203,1392,213.3L1440,224L1440,560L1392,560C1344,560,1248,560,1152,560C1056,560,960,560,864,560C768,560,672,560,576,560C480,560,384,560,288,560C192,560,96,560,48,560L0,560Z" />
    </svg>
  </div>
)

interface SignInPageProps {
  onSubmit?: (email: string, password: string, rememberMe: boolean) => void;
  onGoogleSignIn?: () => void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
  loading?: boolean;
  error?: string | null;
  heroTitle?: string;
  heroDescription?: string;
}

const SignInPage = ({
  onSubmit,
  onGoogleSignIn,
  onForgotPassword,
  onSignUp,
  loading = false,
  error = null,
  heroTitle = "Asuransi Digital Terpercaya",
  heroDescription = "Data Anda dilindungi dengan enkripsi AES-256 standar perbankan. Masuk dengan aman dan nyaman.",
}: SignInPageProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(email, password, rememberMe)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full">
      {/* Left — form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <FormHeader title="Selamat datang" subtitle="Masuk ke akun Anda untuk melanjutkan" />

          <Card className="p-6 sm:p-8 shadow-sm">
            {error && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <InputField id="email" type="email" label="Email" placeholder="nama@contoh.com"
                value={email} onChange={e => setEmail(e.target.value)} icon={Mail} required />
              <PasswordField id="password" label="Password" placeholder="Masukkan password Anda"
                value={password} onChange={e => setPassword(e.target.value)}
                showPassword={showPassword} onTogglePassword={() => setShowPassword(!showPassword)} required />
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="remember" className="flex items-center gap-2 cursor-pointer">
                  <input id="remember" type="checkbox" checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary" />
                  <span className="text-muted-foreground select-none">Ingat saya</span>
                </label>
                {onForgotPassword && (
                  <button type="button" onClick={onForgotPassword}
                    className="text-primary hover:opacity-80 font-medium transition-opacity duration-300">
                    Lupa password?
                  </button>
                )}
              </div>
              <Button type="submit" variant="primary" fullWidth>
                {loading ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-primary-foreground/20 border-t-primary-foreground animate-spin" />Memverifikasi...</>
                ) : 'Masuk'}
              </Button>
              {onGoogleSignIn && (
                <>
                  <Divider text="Atau lanjutkan dengan" />
                  <Button variant="outline" onClick={onGoogleSignIn} fullWidth>
                    <GoogleIcon className="h-5 w-5" />
                    Lanjutkan dengan Google
                  </Button>
                </>
              )}
            </form>
            {onSignUp && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Belum punya akun?{" "}
                <button onClick={onSignUp} className="text-primary hover:opacity-80 font-medium transition-opacity">
                  Daftar sekarang
                </button>
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Right — hero */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-green-950 to-slate-900" />
        <div className="absolute inset-0">
          <AnimatedBlob color="bg-green-500/30" position="top-0 -left-4" />
          <AnimatedBlob color="bg-emerald-500/30" position="top-0 -right-4" delay="animation-delay-2000" />
          <AnimatedBlob color="bg-teal-500/30" position="-bottom-8 left-20" delay="animation-delay-4000" />
        </div>
        <GradientWave />
        <div className="relative z-10 flex items-center justify-center p-8 lg:p-12 w-full">
          <div className="text-center space-y-6 max-w-md">
            <div className="inline-flex rounded-full p-3 bg-white/10 backdrop-blur-sm text-white mb-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">{heroTitle}</h2>
            <p className="text-lg text-white/80">{heroDescription}</p>
            <div className="flex justify-center gap-2 pt-4">
              {[0,1,2].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === 2 ? 'bg-white' : i === 1 ? 'bg-white/60' : 'bg-white/30'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignInPage
