import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { useLogin } from '@workspace/api-client-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const { login: authenticate } = useAuth();
  const { mutateAsync: loginMutation, isPending } = useLogin();
  
  const [email, setEmail] = useState('wael@system.com');
  const [password, setPassword] = useState('123');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await loginMutation({ data: { email, password } });
      authenticate(response.access_token);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute inset-0 z-0">
        <img src={`${import.meta.env.BASE_URL}images/auth-bg.png`} alt="Background" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background to-background"></div>
        
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md p-8"
      >
        <div className="glass-panel rounded-3xl p-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30 mb-8 transform -rotate-6">
            <Shield className="w-10 h-10 text-white transform rotate-6" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">{t('auth.login')}</h1>
          <p className="text-muted-foreground mb-8 text-center">{t('auth.welcome')}</p>
          
          <form onSubmit={handleSubmit} className="w-full space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-background/50 border-white/10 focus:ring-primary focus:border-primary transition-all rounded-xl"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 bg-background/50 border-white/10 focus:ring-primary focus:border-primary transition-all rounded-xl"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              disabled={isPending}
              className="w-full h-12 text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
            >
              {isPending ? t('common.loading') : t('auth.login')}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
