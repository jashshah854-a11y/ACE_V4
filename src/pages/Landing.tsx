import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Play, ArrowRight, ShieldCheck, Zap, Database, Bot } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";

const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-primary/20">
            <Navbar />

            <main className="relative pt-32 pb-20 overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-500/20 opacity-30 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-500/10 opacity-20 blur-[100px] rounded-full pointer-events-none" />

                <div className="container relative z-10 mx-auto px-4 text-center">

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        <span className="text-sm font-medium text-blue-200/80">Autonomous Customer Intelligence</span>
                    </div>

                    {/* Hero Text */}
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                        Transform Your Data Into <br />
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Actionable Intelligence</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        ACE automatically cleans your databases, detects anomalies, and generates consultant-grade reports — delivering insights that used to take weeks in minutes.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                        <Button
                            size="lg"
                            className="h-14 px-8 text-lg rounded-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-900/20"
                            onClick={() => navigate('/dashboard')}
                        >
                            Launch Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-14 px-8 text-lg rounded-full border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm"
                        >
                            <Play className="mr-2 h-5 w-5 fill-current" /> Watch Demo
                        </Button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto border-t border-white/5 pt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                        <div className="text-center group">
                            <div className="text-3xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">99.9%</div>
                            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                                <ShieldCheck className="w-4 h-4" /> Data Accuracy
                            </div>
                        </div>
                        <div className="text-center group">
                            <div className="text-3xl font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">10x</div>
                            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                                <Zap className="w-4 h-4" /> Faster Analysis
                            </div>
                        </div>
                        <div className="text-center group">
                            <div className="text-3xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">500K+</div>
                            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                                <Database className="w-4 h-4" /> Records Processed
                            </div>
                        </div>
                        <div className="text-center group">
                            <div className="text-3xl font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">24/7</div>
                            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                                <Bot className="w-4 h-4" /> Autonomous
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default Landing;
