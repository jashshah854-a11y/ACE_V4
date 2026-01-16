/**
 * Template Processor
 * 
 * Processes story templates with variable substitution and conditional logic.
 */

import { StoryTemplate } from './storyTemplates';
import { TemplateContext, NarrativeVariable } from '@/types/StoryTypes';

export class TemplateProcessor {
    /**
     * Process a template with given context
     */
    static process(template: StoryTemplate, context: TemplateContext): {
        headline: string;
        narrative: string;
    } {
        const headline = this.substituteVariables(template.headline, context.variables);
        const narrative = this.substituteVariables(template.narrative, context.variables);

        return { headline, narrative };
    }

    /**
     * Substitute variables in a template string
     * Supports: {{variable_name}}
     */
    private static substituteVariables(
        template: string,
        variables: Record<string, any>
    ): string {
        let result = template;

        // Find all {{variable}} patterns
        const variablePattern = /\{\{([^}]+)\}\}/g;
        const matches = template.matchAll(variablePattern);

        for (const match of matches) {
            const variableName = match[1].trim();
            const value = this.resolveVariable(variableName, variables);

            if (value !== undefined && value !== null) {
                result = result.replace(match[0], String(value));
            }
        }

        return result;
    }

    /**
     * Resolve a variable from context
     * Supports nested properties: user.name
     */
    private static resolveVariable(
        path: string,
        context: Record<string, any>
    ): any {
        const parts = path.split('.');
        let value: any = context;

        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                return undefined;
            }
        }

        return value;
    }

    /**
     * Evaluate conditional logic
     * Supports: if {{condition}} then "value" else "other"
     */
    static evaluateConditional(
        condition: string,
        variables: Record<string, any>
    ): boolean {
        // Replace variables in condition
        let evaluableCondition = condition;

        const variablePattern = /\{\{([^}]+)\}\}/g;
        const matches = condition.matchAll(variablePattern);

        for (const match of matches) {
            const variableName = match[1].trim();
            const value = this.resolveVariable(variableName, variables);

            if (typeof value === 'number') {
                evaluableCondition = evaluableCondition.replace(match[0], String(value));
            } else if (typeof value === 'string') {
                evaluableCondition = evaluableCondition.replace(match[0], `"${value}"`);
            } else if (typeof value === 'boolean') {
                evaluableCondition = evaluableCondition.replace(match[0], String(value));
            }
        }

        // Safely evaluate the condition
        try {
            // Simple evaluation for common patterns
            // Supports: >, <, >=, <=, ==, !=, &&, ||
            return this.safeEvaluate(evaluableCondition);
        } catch (error) {
            console.error('Failed to evaluate condition:', condition, error);
            return false;
        }
    }

    /**
     * Safely evaluate a simple condition
     */
    private static safeEvaluate(expression: string): boolean {
        // Remove Math.abs if present
        const cleanExpression = expression.replace(/Math\.abs\(([^)]+)\)/g, 'Math.abs($1)');

        // Whitelist of safe operators
        const safePattern = /^[\d\s+\-*/<>=!&|()."']+$/;

        if (!safePattern.test(cleanExpression)) {
            throw new Error('Unsafe expression');
        }

        // Use Function constructor for safe evaluation
        // This is safer than eval() but still requires validation
        const func = new Function(`return ${cleanExpression};`);
        return func();
    }

    /**
     * Format a number based on type
     */
    static formatValue(
        value: any,
        type: 'string' | 'number' | 'percent' | 'currency'
    ): string {
        if (value === null || value === undefined) return '';

        switch (type) {
            case 'percent':
                return `${Number(value).toFixed(1)}%`;

            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(Number(value));

            case 'number':
                if (Math.abs(Number(value)) >= 1000) {
                    return new Intl.NumberFormat('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1
                    }).format(Number(value));
                }
                return Number(value).toFixed(2);

            case 'string':
            default:
                return String(value);
        }
    }

    /**
     * Process conditional variables from template
     */
    static processConditionalVariable(
        conditionalDef: any,
        variables: Record<string, any>
    ): string {
        if (typeof conditionalDef === 'string') {
            return conditionalDef;
        }

        if (conditionalDef.condition) {
            const conditionMet = this.evaluateConditional(
                conditionalDef.condition,
                variables
            );

            if (conditionMet) {
                return conditionalDef.thenValue;
            } else if (conditionalDef.elseValue) {
                // Handle nested conditionals
                if (typeof conditionalDef.elseValue === 'object') {
                    return this.processConditionalVariable(conditionalDef.elseValue, variables);
                }
                return conditionalDef.elseValue;
            }
        }

        return '';
    }
}
