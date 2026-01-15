/**
 * Accordion Group Component
 * 
 * Manages all accordion sections for technical details.
 * Auto-opens validation section if run failed.
 */

import React from 'react';
import { AccordionSection, IssueList } from './AccordionSection';
import type { RunSummaryViewModel } from '@/types/RunSummaryViewModel';

interface AccordionGroupProps {
    viewModel: RunSummaryViewModel;
}

export function AccordionGroup({ viewModel }: AccordionGroupProps) {
    const { run, limitations, technical } = viewModel;

    // Auto-open validation if run failed
    const autoOpenValidation = run.mode === 'failed';

    return (
        <div className="space-y-3">
            {/* Validation Issues */}
            <AccordionSection
                title="Data Quality and Validation"
                issueCount={limitations.validationIssues.length}
                summary={limitations.validationIssues.length > 0
                    ? limitations.validationIssues[0].title
                    : 'All checks passed'}
                defaultOpen={autoOpenValidation}
            >
                <IssueList issues={limitations.validationIssues} />
            </AccordionSection>

            {/* Governance Blocks */}
            <AccordionSection
                title="Governance and Limitations"
                issueCount={limitations.governanceBlocks.length}
                summary={limitations.governanceBlocks.length > 0
                    ? `${limitations.governanceBlocks.length} feature(s) disabled`
                    : 'All features enabled'}
            >
                <IssueList issues={limitations.governanceBlocks} />
            </AccordionSection>

            {/* SCQA Narrative */}
            {technical.scqaNarrative && (
                <AccordionSection
                    title="Story of This Run"
                    summary="View detailed narrative"
                >
                    <div className="space-y-4 text-sm">
                        {technical.scqaNarrative.situation && (
                            <div>
                                <h4 className="font-medium text-foreground mb-1">Situation</h4>
                                <p className="text-muted-foreground">{technical.scqaNarrative.situation}</p>
                            </div>
                        )}
                        {technical.scqaNarrative.complication && (
                            <div>
                                <h4 className="font-medium text-foreground mb-1">Complication</h4>
                                <p className="text-muted-foreground">{technical.scqaNarrative.complication}</p>
                            </div>
                        )}
                        {technical.scqaNarrative.answer && (
                            <div>
                                <h4 className="font-medium text-foreground mb-1">Answer</h4>
                                <p className="text-muted-foreground">{technical.scqaNarrative.answer}</p>
                            </div>
                        )}
                    </div>
                </AccordionSection>
            )}

            {/* Metadata */}
            <AccordionSection
                title="Run Metadata"
                summary="Technical details"
            >
                <table className="w-full text-sm">
                    <tbody>
                        {technical.metadataTable.map((row, index) => (
                            <tr key={index} className="border-b last:border-0">
                                <td className="py-2 font-medium text-foreground">{row.key}</td>
                                <td className="py-2 text-muted-foreground font-mono text-xs">{row.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </AccordionSection>

            {/* Raw JSON */}
            <AccordionSection
                title="Raw Technical Output"
                summary="View complete payload"
            >
                <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                    {JSON.stringify(technical.rawJson, null, 2)}
                </pre>
            </AccordionSection>
        </div>
    );
}
