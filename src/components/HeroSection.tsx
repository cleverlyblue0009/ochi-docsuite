import { ArrowRight, Shield, Zap, Brain, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import heroBackground from "@/assets/metro-hero-bg.jpg";

export const HeroSection = () => {
  const features = [
    { icon: Brain, text: "AI-Powered Classification" },
    { icon: Shield, text: "Enterprise Security" },
    { icon: Zap, text: "Real-time Processing" },
    { icon: FileSearch, text: "Advanced Search" },
  ];

  return (
    <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background">
        <div 
          className="absolute inset-0 opacity-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroBackground})` }}
        ></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="flex justify-center">
            <Badge className="bg-gradient-metro text-white px-4 py-2 text-sm font-medium shadow-glow">
              🚄 Next-Generation Document Management
            </Badge>
          </div>

          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-foreground leading-tight">
              Automated Document 
              <span className="block bg-gradient-metro bg-clip-text text-transparent">
                Overload Solution
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Transforming Kochi Metro Rail Limited's document management with AI-powered 
              classification, real-time processing, and intelligent workflow automation.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 py-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 bg-card border border-border rounded-full px-4 py-2 shadow-metro hover:shadow-elevated smooth-transition"
              >
                <feature.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button
              size="lg"
              className="bg-gradient-metro text-white shadow-glow hover:shadow-elevated smooth-transition group"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 smooth-transition" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground smooth-transition"
            >
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 max-w-4xl mx-auto">
            {[
              { value: "10M+", label: "Documents Processed" },
              { value: "99.8%", label: "Accuracy Rate" },
              { value: "50x", label: "Faster Processing" },
              { value: "24/7", label: "System Uptime" },
            ].map((stat, index) => (
              <div key={index} className="text-center space-y-2">
                <div className="text-2xl sm:text-3xl font-heading font-bold text-primary">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rail line decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-rail"></div>
    </section>
  );
};