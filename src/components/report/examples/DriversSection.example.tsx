/**
 * Example: How to use the new report components
 * 
 * This demonstrates the pattern for modernizing existing report sections
 * with SectionFrame, ExplanationBlock, and ChartWrapper.
 */

import { SectionFrame } from "@/components/report/SectionFrame";
import { ExplanationBlock } from "@/components/report/ExplanationBlock";
import { ChartWrapper } from "@/components/report/ChartWrapper";
import { getSectionCopy } from "@/lib/reportCopy";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Example data
const driverData = [
    { feature: "Product Quality", importance: 85 },
    { feature: "Customer Service", importance: 72 },
    { feature: "Pricing", importance: 68 },
    { feature: "Brand Recognition", importance: 54 },
    { feature: "Delivery Speed", importance: 41 },
];

export function DriversSection() {
    // Get copy with dynamic tokens
    const explanationCopy = getSectionCopy("drivers", {
        targetVariable: "Customer Satisfaction",
        model_type: "Random Forest",
        sample_size: "12,453",
    });

    return (
        <SectionFrame
            id="drivers-section"
            title="Outcome Drivers"
            subtitle="What influences Customer Satisfaction the most?"
            roleVisibility="all"
            primary={
                <>
                    {/* Explanation first */}
                    <ExplanationBlock {...explanationCopy} />

                    {/* Chart with metadata and caption */}
                    <ChartWrapper
                        title="Top 5 Drivers of Customer Satisfaction"
                        questionAnswered="Which factors have the strongest influence on outcomes?"
                        source="Customer feedback data"
                        dateRange="Jan 2024 - Dec 2024"
                        sampleSize={12453}
                        confidence={87}
                        metricDefinitions={{
                            "Importance Score": "Percentage contribution to prediction accuracy (0-100)",
                            "Customer Satisfaction": "Net Promoter Score (NPS) from post-purchase survey",
                        }}
                        caption={{
                            text: "Product Quality drives 85% of satisfaction variance. Focus quality improvements for maximum ROI.",
                            severity: "positive",
                        }}
                        chart={
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={driverData} layout="vertical" margin={{ left: 120 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 100]} />
                                    <YAxis dataKey="feature" type="category" />
                                    <Tooltip />
                                    <Bar dataKey="importance" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        }
                    />
                </>
            }
            // Optional secondary content for analysts/experts
            secondary={
                <div className="text-sm text-muted-foreground">
                    <p className="font-semibold mb-2">Model Details:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Algorithm: Random Forest with 100 trees</li>
                        <li>R² Score: 0.72</li>
                        <li>Cross-validation: 5-fold</li>
                        <li>Training/Test split: 70/30</li>
                    </ul>
                </div>
            }
        />
    );
}

/*
 * MIGRATION PATTERN FOR EXISTING COMPONENTS:
 * 
 * 1. Wrap existing JSX in <SectionFrame>
 * 2. Add <ExplanationBlock> at the top of primary content
 * 3. Wrap charts with <ChartWrapper> and add metadata
 * 4. Move technical details to secondary prop
 * 5. Update copy registry if needed
 * 
 * Before:
 * <div className="section">
 *   <h2>Title</h2>
 *   <MyChart data={data} />
 * </div>
 * 
 * After:
 * <SectionFrame
 *   id="my-section"
 *   title="Title"
 *   primary={
 *     <>
 *       <ExplanationBlock {...getSectionCopy("my-section")} />
 *       <ChartWrapper
 *         title="Chart Title"
 *         chart={<MyChart data={data} />}
 *         caption={{ text: "Key insight here" }}
 *       />
 *     </>
 *   }
 * />
 */
