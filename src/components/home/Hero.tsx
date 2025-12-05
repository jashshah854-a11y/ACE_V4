import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-30" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/20 via-transparent to-transparent blur-3xl" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      
      {/* Floating Elements */}
      <div className="absolute top-1/3 left-[15%] w-2 h-2 rounded-full bg-primary animate-float opacity-60" style={{ animationDelay: "0s" }} />
      <div className="absolute top-1/2 right-[20%] w-3 h-3 rounded-full bg-accent animate-float opacity-40" style={{ animationDelay: "1s" }} />
      <div className="absolute bottom-1/3 left-[25%] w-2 h-2 rounded-full bg-primary animate-float opacity-50" style={{ animationDelay: "2s" }} />

      <div className="container relative z-10 px-4 py-20">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Autonomous Customer Intelligence
            </span>
          </div>

          {/* Heading */}
          <h1 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="text-foreground">Transform Your Data Into</span>
            <br />
            <span className="gradient-text">Actionable Intelligence</span>
          </h1>

          {/* Subheading */}
          <p 
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 text-balance animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            ACE automatically cleans your databases, detects anomalies, and generates 
            consultant-grade reports — delivering insights that used to take weeks in minutes.
          </p>

          {/* CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row gap-4 animate-slide-up"
            style={{ animationDelay: "0.3s" }}
          >
            <Link to="/dashboard">
              <Button variant="hero" size="xl" className="group">
                Launch Dashboard
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Button variant="hero-outline" size="xl" className="group">
              <Play className="h-5 w-5" />
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 w-full max-w-3xl animate-fade-in"
            style={{ animationDelay: "0.5s" }}
          >
            {[
              { value: "99.9%", label: "Data Accuracy" },
              { value: "10x", label: "Faster Analysis" },
              { value: "500K+", label: "Records Processed" },
              { value: "24/7", label: "Autonomous" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
