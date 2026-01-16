"""
Story Generation Module

Generates narrative stories from ACE analysis results.
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class StoryGenerator:
    """Generates data stories from analysis results."""
    
    def __init__(self):
        self.story_types = [
            'change_over_time',
            'drill_down',
            'contrast',
            'outliers',
            'intersections'
        ]
    
    def generate_story(
        self,
        run_id: str,
        analytics_data: Dict[str, Any],
        dataset_profile: Dict[str, Any],
        tone: str = 'conversational'
    ) -> Dict[str, Any]:
        """
        Generate a complete story from analytics data.
        
        Args:
            run_id: Unique run identifier
            analytics_data: Enhanced analytics output
            dataset_profile: Dataset identity information
            tone: Narrative tone ('formal' or 'conversational')
        
        Returns:
            Complete story structure with points
        """
        logger.info(f"Generating {tone} story for run {run_id}")
        
        # Select appropriate story types based on data
        selected_types = self._select_story_types(analytics_data)
        
        # Generate story points
        story_points = []
        for sequence, story_type in enumerate(selected_types, start=1):
            point = self._generate_story_point(
                story_type=story_type,
                analytics_data=analytics_data,
                tone=tone,
                sequence=sequence
            )
            if point:
                story_points.append(point)
        
        # Generate title and summary
        title = self._generate_title(story_points, tone)
        summary = self._generate_summary(story_points, tone)
        
        return {
            'run_id': run_id,
            'title': title,
            'summary': summary,
            'tone': tone,
            'points': story_points,
            'metadata': {
                'created_at': datetime.utcnow().isoformat(),
                'dataset_name': dataset_profile.get('name'),
                'row_count': dataset_profile.get('row_count'),
                'column_count': dataset_profile.get('column_count')
            }
        }
    
    def _select_story_types(self, analytics_data: Dict[str, Any]) -> List[str]:
        """Select appropriate story types based on available data."""
        types = []
        
        # Check for time series data
        if analytics_data.get('time_series') or analytics_data.get('trends'):
            types.append('change_over_time')
        
        # Check for hierarchical/segment data
        if analytics_data.get('segments') or analytics_data.get('breakdown'):
            types.append('drill_down')
        
        # Check for comparisons
        if analytics_data.get('comparisons') or analytics_data.get('ab_test'):
            types.append('contrast')
        
        # Check for outliers
        if analytics_data.get('outliers') or analytics_data.get('anomalies'):
            types.append('outliers')
        
        # Check for correlations
        if analytics_data.get('correlations') or analytics_data.get('relationships'):
            types.append('intersections')
        
        # Default to at least one story type
        if not types:
            types.append('change_over_time')
        
        return types[:5]  # Limit to 5 story points
    
    def _generate_story_point(
        self,
        story_type: str,
        analytics_data: Dict[str, Any],
        tone: str,
        sequence: int
    ) -> Optional[Dict[str, Any]]:
        """Generate a single story point."""
        
        # Extract variables based on story type
        variables = self._extract_variables(story_type, analytics_data)
        
        if not variables:
            return None
        
        # Get template for story type and tone
        template = self._get_template(story_type, tone)
        
        # Process template with variables
        headline = self._process_template(template['headline'], variables)
        narrative = self._process_template(template['narrative'], variables)
        
        # Add anecdote for conversational tone
        if tone == 'conversational' and '{{anecdote}}' in narrative:
            anecdote = self._get_anecdote(story_type, tone)
            narrative = narrative.replace('{{anecdote}}', anecdote)
        
        return {
            'id': f'point_{sequence}',
            'sequence': sequence,
            'headline': headline,
            'narrative': narrative,
            'visual': self._generate_chart_spec(story_type, variables),
            'evidence': [],
            'interactions': [],
            'metadata': {
                'story_type': story_type,
                'tone': tone,
                'confidence': 0.85,
                'timestamp': datetime.utcnow().isoformat()
            }
        }
    
    def _extract_variables(
        self,
        story_type: str,
        analytics_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract variables from analytics data for a story type."""
        
        variables = {}
        
        if story_type == 'change_over_time':
            variables = {
                'metric_name': analytics_data.get('primary_metric', 'Revenue'),
                'start_value': self._format_currency(analytics_data.get('start_value', 0)),
                'end_value': self._format_currency(analytics_data.get('end_value', 0)),
                'change_percent': analytics_data.get('change_percent', 0),
                'time_period': analytics_data.get('time_period', 'this period'),
                'context_statement': analytics_data.get('context', '')
            }
        
        elif story_type == 'drill_down':
            variables = {
                'parent_metric': analytics_data.get('parent_metric', 'Total'),
                'parent_value': self._format_currency(analytics_data.get('parent_value', 0)),
                'child_metric': analytics_data.get('child_metric', 'Segment'),
                'contribution_percent': analytics_data.get('contribution_percent', 0)
            }
        
        elif story_type == 'contrast':
            variables = {
                'item_a': analytics_data.get('item_a', 'Item A'),
                'item_b': analytics_data.get('item_b', 'Item B'),
                'value_a': self._format_number(analytics_data.get('value_a', 0)),
                'value_b': self._format_number(analytics_data.get('value_b', 0)),
                'difference_percent': analytics_data.get('difference_percent', 0),
                'driver': analytics_data.get('driver', 'various factors')
            }
        
        elif story_type == 'outliers':
            variables = {
                'outlier_count': analytics_data.get('outlier_count', 0),
                'entity_type': analytics_data.get('entity_type', 'items'),
                'mean_value': self._format_number(analytics_data.get('mean_value', 0)),
                'outlier_min': self._format_number(analytics_data.get('outlier_min', 0)),
                'outlier_max': self._format_number(analytics_data.get('outlier_max', 0)),
                'outlier_percent': analytics_data.get('outlier_percent', 0),
                'explanation': analytics_data.get('explanation', '')
            }
        
        elif story_type == 'intersections':
            variables = {
                'factor_a': analytics_data.get('factor_a', 'Factor A'),
                'factor_b': analytics_data.get('factor_b', 'Factor B'),
                'correlation_coefficient': analytics_data.get('correlation_coefficient', 0),
                'implication': analytics_data.get('implication', 'a relationship exists')
            }
        
        return variables
    
    def _get_template(self, story_type: str, tone: str) -> Dict[str, str]:
        """Get narrative template for story type and tone."""
        
        templates = {
            'change_over_time': {
                'formal': {
                    'headline': '{{metric_name}} increased {{change_percent}}% {{time_period}}',
                    'narrative': 'Analysis indicates that {{metric_name}} increased from {{start_value}} to {{end_value}} over {{time_period}}. This represents a {{change_percent}}% growth. {{context_statement}}'
                },
                'conversational': {
                    'headline': '{{metric_name}} jumped {{change_percent}}%',
                    'narrative': "Here's what happened: {{metric_name}} jumped from {{start_value}} to {{end_value}} over {{time_period}}. That's a {{change_percent}}% growth - that's significant."
                }
            },
            'drill_down': {
                'formal': {
                    'headline': '{{parent_metric}} analysis reveals {{child_metric}} contribution',
                    'narrative': 'Examination of {{parent_metric}} ({{parent_value}}) demonstrates that {{child_metric}} accounts for {{contribution_percent}}% of the total. This segment exhibits dominant performance relative to other categories.'
                },
                'conversational': {
                    'headline': "Let's break down {{parent_metric}}",
                    'narrative': "When we zoom into {{parent_metric}}, {{child_metric}} stands out - it's driving {{contribution_percent}}% of the total. That's more than half!"
                }
            },
            'contrast': {
                'formal': {
                    'headline': '{{item_a}} vs {{item_b}}: {{difference_percent}}% differential',
                    'narrative': 'Comparative analysis reveals that {{item_a}} ({{value_a}}) exceeds {{item_b}} ({{value_b}}) by {{difference_percent}}%. The primary contributing factor is {{driver}}.'
                },
                'conversational': {
                    'headline': '{{item_a}} outperforms {{item_b}}',
                    'narrative': "Here's the comparison: {{item_a}} is at {{value_a}}, while {{item_b}} is at {{value_b}}. That's a {{difference_percent}}% difference, mainly because of {{driver}}."
                }
            },
            'outliers': {
                'formal': {
                    'headline': 'Anomaly detected: {{outlier_count}} {{entity_type}} exceed normal range',
                    'narrative': 'Statistical analysis identifies {{outlier_count}} {{entity_type}} that deviate significantly from the mean ({{mean_value}}). These outliers range from {{outlier_min}} to {{outlier_max}}, representing {{outlier_percent}}% of the dataset. {{explanation}}.'
                },
                'conversational': {
                    'headline': 'Some {{entity_type}} stand out from the crowd',
                    'narrative': 'Most {{entity_type}} cluster around {{mean_value}}, but {{outlier_count}} are way different - ranging from {{outlier_min}} to {{outlier_max}}. Think of them like {{anecdote}}. {{explanation}}.'
                }
            },
            'intersections': {
                'formal': {
                    'headline': '{{factor_a}} and {{factor_b}} correlation: {{correlation_coefficient}}',
                    'narrative': 'Analysis reveals a strong positive correlation (r = {{correlation_coefficient}}) between {{factor_a}} and {{factor_b}}. This relationship suggests {{implication}}.'
                },
                'conversational': {
                    'headline': 'How {{factor_a}} relates to {{factor_b}}',
                    'narrative': "There's a strong connection between {{factor_a}} and {{factor_b}} (correlation: {{correlation_coefficient}}). When {{factor_a}} goes up, {{factor_b}} tends to go up. {{implication}}."
                }
            }
        }
        
        return templates.get(story_type, {}).get(tone, templates['change_over_time']['conversational'])
    
    def _process_template(self, template: str, variables: Dict[str, Any]) -> str:
        """Process template with variable substitution."""
        result = template
        
        for key, value in variables.items():
            placeholder = f'{{{{{key}}}}}'
            result = result.replace(placeholder, str(value))
        
        return result
    
    def _get_anecdote(self, story_type: str, tone: str) -> str:
        """Get contextual anecdote for story type."""
        anecdotes = {
            'outliers': 'the tall person in a crowd photo - easy to spot',
            'intersections': 'two friends walking in sync',
            'change_over_time': 'a marathon runner\'s pace - consistent over time'
        }
        return anecdotes.get(story_type, 'an interesting pattern')
    
    def _generate_chart_spec(self, story_type: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        """Generate chart specification for story point."""
        chart_types = {
            'change_over_time': 'line_chart',
            'drill_down': 'bar_chart',
            'contrast': 'bar_chart',
            'outliers': 'scatter_plot',
            'intersections': 'scatter_plot'
        }
        
        return {
            'type': chart_types.get(story_type, 'bar_chart'),
            'data': {},
            'config': {
                'title': variables.get('metric_name', 'Chart'),
                'legend': True,
                'colors': ['#3b82f6', '#8b5cf6', '#ec4899']
            }
        }
    
    def _generate_title(self, points: List[Dict[str, Any]], tone: str) -> str:
        """Generate story title."""
        if not points:
            return 'Data Story'
        
        first_headline = points[0]['headline']
        
        if tone == 'formal':
            return f'Analysis: {first_headline}'
        else:
            return first_headline
    
    def _generate_summary(self, points: List[Dict[str, Any]], tone: str) -> str:
        """Generate story summary."""
        if not points:
            return 'No insights available'
        
        first_narrative = points[0]['narrative'].split('.')[0]
        
        if tone == 'formal':
            return f'The data indicates {first_narrative}.'
        else:
            return f'The takeaway: {first_narrative}.'
    
    def _format_currency(self, value: float) -> str:
        """Format value as currency."""
        if value >= 1_000_000:
            return f'${value / 1_000_000:.1f}M'
        elif value >= 1_000:
            return f'${value / 1_000:.1f}K'
        else:
            return f'${value:,.0f}'
    
    def _format_number(self, value: float) -> str:
        """Format number with appropriate precision."""
        if value >= 1_000:
            return f'{value:,.0f}'
        else:
            return f'{value:.2f}'
