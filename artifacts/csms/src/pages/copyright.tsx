import { motion } from 'framer-motion';
import { Shield, Facebook, Code, Phone, Heart } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function Copyright() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-2xl p-8"
      >
        <div className="glass-panel rounded-3xl p-12 flex flex-col items-center text-center">
          
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/40 mb-8 transform rotate-12 hover:rotate-0 transition-transform duration-500 cursor-pointer"
          >
            <Shield className="w-12 h-12 text-white" />
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            نظام إدارة خدمة العملاء
          </h1>
          <p className="text-xl text-primary font-semibold mb-8">CSMS Enterprise Edition v1.0</p>
          
          <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent my-8"></div>
          
          <div className="space-y-6 w-full max-w-md mx-auto">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Code className="w-5 h-5" />
                </div>
                <span className="font-semibold text-foreground text-lg">المطور</span>
              </div>
              <span className="text-muted-foreground font-bold">Wael Kadous</span>
            </div>

            <a href="https://www.facebook.com/wael.kadous.71/" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <Facebook className="w-5 h-5" />
                </div>
                <span className="font-semibold text-foreground text-lg">Facebook</span>
              </div>
              <span className="text-muted-foreground group-hover:text-blue-500 font-bold transition-colors dir-ltr">@wael.kadous.71</span>
            </a>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 hover:border-green-500/50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <span className="font-semibold text-foreground text-lg">الهاتف</span>
              </div>
              <span className="text-muted-foreground font-bold font-mono text-lg">01515196224</span>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center">
            <p className="text-muted-foreground flex items-center gap-2 mb-6">
              تم التطوير بكل <Heart className="w-4 h-4 text-destructive animate-pulse" /> في عام {new Date().getFullYear()}
            </p>
            <Link href="/">
              <Button variant="outline" className="rounded-xl border-border/50 hover:bg-card px-8 h-12">
                العودة للرئيسية
              </Button>
            </Link>
          </div>
          
        </div>
      </motion.div>
    </div>
  );
}
