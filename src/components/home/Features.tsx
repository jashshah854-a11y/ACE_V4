import { 
  Database, 
  AlertTriangle, 
  FileText, 
  Zap, 
  Shield, 
  BarChart3 
} from "lucide-react";

const features = [
  {
    icon: Database,
    title: "Database Cleaning",
    description: "Automatically identify and fix data quality issues, duplicates, and inconsistencies across your entire database.",
  },
  {
    icon: AlertTriangle,
    title: "Anomaly Detection",
    description: "AI-powered detection of unusual patterns, outliers, and potential data integrity issues in real-time.",
  },
  {
    icon: FileText,
    title: "Intelligent Reports",
    description: "Generate comprehensive, consultant-grade reports with actionable insights and recommendations.",
  },
  {
    icon: Zap,
    title: "Autonomous Processing",
    description: "Set it and forget it. ACE continuously monitors and improves your data quality 24/7.",
  },
  {
    icon: Shield,
    title: "Data Validation",
    description: "Enforce data quality rules and validation constraints automatically across all data sources.",
  },
  {
    icon: BarChart3,
    title: "Visual Analytics",
    description: "Beautiful dashboards and visualizations to understand your data health at a glance.",
  },
];

export function Features() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />
      
      <div className="container relative z-10 px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need for{" "}
            <span className="gradient-text">Data Excellence</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Powerful features that transform raw data into strategic assets
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative p-6 rounded-2xl glass-card hover:bg-secondary/30 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-6 w-6" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Glow Effect */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 rounded-2xl bg-gradient-radial from-primary/5 via-transparent to-transparent" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
