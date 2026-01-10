import { useParams } from 'react-router-dom';
import { IntelligenceCanvas } from '@/components/intelligence/IntelligenceCanvas';

export default function ReportPage() {
    const { runId } = useParams<{ runId: string }>();

    if (!runId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
                    <p className="text-muted-foreground">Run ID not provided</p>
                </div>
            </div>
        );
    }

    return <IntelligenceCanvas runId={runId} />;
}
