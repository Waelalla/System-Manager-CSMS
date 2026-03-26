import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md p-8 glass-panel rounded-3xl">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="text-lg text-muted-foreground">الصفحة التي تبحث عنها غير موجودة</p>
        <Link href="/">
          <Button className="rounded-xl mt-4 bg-primary text-white hover:bg-primary/90">
            العودة للرئيسية
          </Button>
        </Link>
      </div>
    </div>
  );
}
