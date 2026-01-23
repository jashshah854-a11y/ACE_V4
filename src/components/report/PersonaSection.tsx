import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonaCard, PERSONA_GRADIENTS } from "./PersonaCard";
import { PersonaData } from "@/lib/reportParser";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { motion } from "framer-motion";
import type { AnalysisIntent, ScopeConstraint, TargetCandidate } from "@/types/analysisIntent";

interface PersonaSectionProps {
    personas: PersonaData[];
    scopeConstraints?: ScopeConstraint[];
    analysisIntent?: AnalysisIntent;
    targetCandidate?: TargetCandidate;
}

/**
 * Visual persona section with distribution chart and persona cards
 */
export function PersonaSection({ personas, scopeConstraints = [], analysisIntent, targetCandidate }: PersonaSectionProps) {
    // Null safety - filter valid personas
    const validPersonas = Array.isArray(personas) 
        ? personas.filter(p => p && p.name && typeof p.size === 'number')
        : [];

    if (validPersonas.length === 0) {
        return null;
    }

    // Prepare data for pie chart
    const chartData = validPersonas.map((p, idx) => ({
        name: p.name || `Persona ${idx + 1}`,
        value: p.size || 0,
        color: PERSONA_GRADIENTS[idx % PERSONA_GRADIENTS.length].split(' ')[1] // Extract first color from gradient
    }));

    const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f97316', '#ec4899', '#6366f1'];

    const total = validPersonas.reduce((sum, p) => sum + (p.size || 0), 0);

    return (
        <div className="space-y-6">
            {/* Distribution Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Persona Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Persona Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {validPersonas.map((persona, idx) => {
                    const percentage = total > 0 ? ((persona.size || 0) / total) * 100 : 0;

                    return (
                        <PersonaCard
                            key={idx}
                            name={persona.name || `Persona ${idx + 1}`}
                            description={persona.summary || persona.motivation || 'No description available'}
                            size={persona.size || 0}
                            percentage={percentage}
                            gradient={PERSONA_GRADIENTS[idx % PERSONA_GRADIENTS.length]}
                            icon="👤"
                            index={idx}
                        />
                    );
                })}
            </div>
        </div>
    );
}
