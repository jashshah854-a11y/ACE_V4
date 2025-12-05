import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { AnomalyList } from "@/components/dashboard/AnomalyList";
import { DataQualityChart } from "@/components/dashboard/DataQualityChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Zap,
  RefreshCw,
  Download
} from "lucide-react";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Monitor your data quality and autonomous operations
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button variant="hero" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Full Scan
              </Button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              title="Data Quality Score"
              value="98.2%"
              change={2.4}
              changeLabel="vs last week"
              icon={CheckCircle}
              variant="primary"
            />
            <MetricCard
              title="Records Processed"
              value="2.3M"
              change={12}
              changeLabel="vs last week"
              icon={Database}
              variant="accent"
            />
            <MetricCard
              title="Active Anomalies"
              value="4"
              change={-40}
              changeLabel="vs last week"
              icon={AlertTriangle}
              variant="warning"
            />
            <MetricCard
              title="Auto-Fixes Applied"
              value="1,247"
              change={8}
              changeLabel="vs last week"
              icon={Zap}
              variant="default"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Chart & Anomalies */}
            <div className="lg:col-span-2 space-y-6">
              <DataQualityChart />
              <AnomalyList />
            </div>

            {/* Right Column - Activity */}
            <div>
              <RecentActivity />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
