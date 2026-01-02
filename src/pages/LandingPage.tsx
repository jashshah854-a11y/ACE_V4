import { HeroSection } from '@/components/landing/HeroSection';
import { VisionBlocks } from '@/components/landing/VisionBlocks';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0F1115]">
            <HeroSection />
            <VisionBlocks />

            {/* Footer */}
            <footer className="border-t border-[#E2E4E9]/10 bg-[#0F1115] py-12">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <p className="text-sm font-mono text-[#E2E4E9]/50">
                        ACE V4 · Decision-Grade Intelligence Platform
                    </p>
                </div>
            </footer>
        </div>
    );
}
