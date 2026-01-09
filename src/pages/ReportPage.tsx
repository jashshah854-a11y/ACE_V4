import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EnhancedReportViewer } from '@/components/report/EnhancedReportViewer';
import { getReport } from '@/lib/api-client';

export default function ReportPage() {
    const { runId } = useParams<{ runId: string }>();

    const { data: content, isLoading, error } = useQuery({
        queryKey: ['report', runId],
        queryFn: () => getReport(runId!),
        enabled: Boolean(runId),
        staleTime: 30000,
    });

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Report</h1>
                    <p className="text-muted-foreground">{(error as Error).message}</p>
                </div>
            </div>
        );
    }

    if (isLoading || !content) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading report...</p>
                </div>
            </div>
        );
    }

    return (
        <EnhancedReportViewer
            content={content}
            runId={runId || ''}
            isLoading={false}
        />
    );
}
