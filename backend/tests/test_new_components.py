"""
Comprehensive Reverse Test Suite for ACE V4 New Components

Tests:
1. Import validation for all new modules
2. NarrativeEngine unit tests
3. SHAP Explainer unit tests  
4. Expositor integration test
5. End-to-end pipeline test
"""
import sys
import traceback
from pathlib import Path

# Add backend to path (parent of tests/)
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_result(test_name, passed, error=None):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"  {status} - {test_name}")
    if error and not passed:
        print(f"       Error: {str(error)[:100]}")

results = []

# =============================================================================
# TEST 1: Import Validation
# =============================================================================
print_header("TEST 1: Import Validation")

# Test 1.1: NarrativeEngine
try:
    from core.narrative_engine import NarrativeEngine, create_narrative_engine, NarrativeSection
    print_result("Import NarrativeEngine", True)
    results.append(("Import NarrativeEngine", True))
except Exception as e:
    print_result("Import NarrativeEngine", False, e)
    results.append(("Import NarrativeEngine", False))

# Test 1.2: SHAP Explainer
try:
    from core.shap_explainer import (
        compute_shap_explanations,
        explain_single_prediction,
        generate_shap_narrative,
        add_shap_to_regression_output
    )
    print_result("Import SHAP Explainer", True)
    results.append(("Import SHAP Explainer", True))
except Exception as e:
    print_result("Import SHAP Explainer", False, e)
    results.append(("Import SHAP Explainer", False))

# Test 1.3: Expositor (with new methods)
try:
    from agents.expositor import Expositor
    # Check new method exists
    assert hasattr(Expositor, '_generate_executive_report'), "Missing _generate_executive_report method"
    print_result("Import Expositor with new methods", True)
    results.append(("Import Expositor", True))
except Exception as e:
    print_result("Import Expositor with new methods", False, e)
    results.append(("Import Expositor", False))

# =============================================================================
# TEST 2: NarrativeEngine Unit Tests
# =============================================================================
print_header("TEST 2: NarrativeEngine Unit Tests")

try:
    narrator = NarrativeEngine(domain="marketing_performance")
    
    # Test 2.1: Column humanization
    result = narrator._humanize_column("email_clicks")
    assert "Email" in result or "email" in result.lower(), f"Expected humanized column, got: {result}"
    print_result("Column humanization", True)
    results.append(("Column humanization", True))
    
    # Test 2.2: Correlation translation
    result = narrator.translate_correlation("revenue", "conversions", 0.85)
    assert "strong" in result.lower(), f"Expected 'strong' in correlation, got: {result}"
    assert "Revenue" in result or "revenue" in result.lower(), f"Expected feature name in result"
    print_result("Correlation translation", True)
    results.append(("Correlation translation", True))
    
    # Test 2.3: Segment translation
    result = narrator.translate_segment(segment_id=0, size=500, total=1000, persona_name="Champions")
    assert result["name"] == "Champions", f"Expected Champions, got: {result['name']}"
    assert result["percentage"] == 50.0, f"Expected 50%, got: {result['percentage']}"
    print_result("Segment translation", True)
    results.append(("Segment translation", True))
    
    # Test 2.4: Driver translation
    result = narrator.translate_driver("email_clicks", 72.5, rank=1, target="conversions")
    assert "Top driver" in result, f"Expected 'Top driver', got: {result}"
    assert "72.5" in result, f"Expected importance value in result"
    print_result("Driver translation", True)
    results.append(("Driver translation", True))
    
    # Test 2.5: Executive summary generation
    result = narrator.generate_executive_summary(
        data_type="marketing_performance",
        row_count=1000,
        top_correlation={"feature1": "clicks", "feature2": "revenue", "pearson": 0.82},
        top_driver={"feature": "email_engagement", "importance": 45},
        segment_count=4,
        anomaly_count=25
    )
    assert len(result) > 50, "Executive summary too short"
    assert "pattern" in result.lower() or "reveal" in result.lower(), f"Expected analysis language"
    print_result("Executive summary generation", True)
    results.append(("Executive summary", True))
    
    # Test 2.6: Recommendations generation
    result = narrator.generate_recommendations(
        correlations=[{"feature1": "clicks", "feature2": "revenue", "pearson": 0.85}],
        drivers=[{"feature": "email", "importance": 45}, {"feature": "social", "importance": 25}]
    )
    assert len(result) >= 1, "Expected at least 1 recommendation"
    assert result[0]["priority"] in ["High", "Medium", "Low"], "Expected valid priority"
    print_result("Recommendations generation", True)
    results.append(("Recommendations", True))
    
    # Test 2.7: SHAP translation
    shap_result = {
        "importance_ranking": [
            {"feature": "revenue", "importance": 0.45, "direction": "positive"},
            {"feature": "clicks", "importance": 0.15, "direction": "positive"},
            {"feature": "spend", "importance": 0.10, "direction": "negative"},
        ]
    }
    result = narrator.translate_shap_explanation(shap_result, "conversion")
    assert "revenue" in result.lower() or "Revenue" in result, f"Expected feature name in SHAP explanation, got: {result}"
    assert len(result) > 20, f"Expected non-empty SHAP explanation"
    print_result("SHAP translation", True)
    results.append(("SHAP translation", True))
    
except Exception as e:
    print_result("NarrativeEngine tests", False, e)
    traceback.print_exc()
    results.append(("NarrativeEngine tests", False))

# =============================================================================
# TEST 3: SHAP Explainer Unit Tests
# =============================================================================
print_header("TEST 3: SHAP Explainer Unit Tests")

try:
    import numpy as np
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    
    # Create test data
    np.random.seed(42)
    X = pd.DataFrame({
        'feature_a': np.random.randn(100),
        'feature_b': np.random.randn(100),
        'feature_c': np.random.randint(0, 10, 100),
    })
    y_class = (X['feature_a'] > 0).astype(int)
    y_reg = X['feature_a'] * 2 + X['feature_b'] + np.random.randn(100) * 0.1
    
    # Test 3.1: Classification SHAP
    model_class = RandomForestClassifier(n_estimators=5, random_state=42)
    model_class.fit(X, y_class)
    
    result = compute_shap_explanations(model_class, X, model_type='tree', max_samples=50)
    assert "importance_ranking" in result, "Missing importance_ranking"
    assert len(result["importance_ranking"]) > 0, "Empty importance ranking"
    assert all(key in result["importance_ranking"][0] for key in ["feature", "importance", "direction"]), "Missing keys"
    print_result("Classification SHAP computation", True)
    results.append(("Classification SHAP", True))
    
    # Test 3.2: Regression SHAP
    model_reg = RandomForestRegressor(n_estimators=5, random_state=42)
    model_reg.fit(X, y_reg)
    
    result = compute_shap_explanations(model_reg, X, model_type='tree', max_samples=50)
    assert result["importance_ranking"][0]["feature"] == "feature_a", f"Expected feature_a as top, got: {result['importance_ranking'][0]['feature']}"
    print_result("Regression SHAP computation", True)
    results.append(("Regression SHAP", True))
    
    # Test 3.3: SHAP narrative generation
    narrative = generate_shap_narrative(result, target_name="outcome")
    assert len(narrative) > 20, "Narrative too short"
    assert "Feature A" in narrative or "feature_a" in narrative.lower(), "Missing feature name"
    print_result("SHAP narrative generation", True)
    results.append(("SHAP narrative", True))
    
    # Test 3.4: Single prediction explanation
    single_result = explain_single_prediction(
        model_class, X, X.iloc[0], model_type='tree'
    )
    assert "contributions" in single_result, "Missing contributions"
    assert "prediction" in single_result, "Missing prediction"
    print_result("Single prediction explanation", True)
    results.append(("Single prediction", True))
    
except Exception as e:
    print_result("SHAP Explainer tests", False, e)
    traceback.print_exc()
    results.append(("SHAP Explainer tests", False))

# =============================================================================
# TEST 4: Expositor Structure Validation
# =============================================================================
print_header("TEST 4: Expositor Structure Validation")

try:
    import inspect
    from agents.expositor import Expositor
    
    # Test 4.1: Check method signature
    sig = inspect.signature(Expositor._generate_executive_report)
    params = list(sig.parameters.keys())
    expected_params = ['self', 'data_type', 'validation', 'enhanced_analytics', 
                       'overseer', 'personas', 'importance_report', 'sentry',
                       'row_count', 'col_count', 'confidence_score']
    for param in expected_params:
        assert param in params, f"Missing parameter: {param}"
    print_result("Expositor method signature", True)
    results.append(("Expositor signature", True))
    
    # Test 4.2: Check imports in expositor
    import agents.expositor as exp_module
    source = inspect.getsource(exp_module)
    assert "from core.narrative_engine import" in source, "Missing NarrativeEngine import"
    print_result("Expositor imports NarrativeEngine", True)
    results.append(("Expositor imports", True))
    
except Exception as e:
    print_result("Expositor structure tests", False, e)
    traceback.print_exc()
    results.append(("Expositor structure", False))

# =============================================================================
# TEST 5: Integration Test - NarrativeEngine + SHAP
# =============================================================================
print_header("TEST 5: Integration Test")

try:
    # Create mock data simulating real pipeline output
    mock_shap = {
        "importance_ranking": [
            {"feature": "monthly_spend", "importance": 0.35, "direction": "positive", "impact_magnitude": 0.35},
            {"feature": "tenure_months", "importance": 0.25, "direction": "negative", "impact_magnitude": -0.25},
            {"feature": "support_calls", "importance": 0.15, "direction": "positive", "impact_magnitude": 0.15},
        ],
        "base_value": 0.5,
        "explained_samples": 100
    }
    
    narrator = NarrativeEngine(domain="saas")
    
    # Generate SHAP-grounded explanation
    shap_explanation = narrator.translate_shap_explanation(mock_shap, "churn")
    
    # Generate executive summary
    exec_summary = narrator.generate_executive_summary(
        data_type="saas",
        row_count=5000,
        top_driver={"feature": "monthly_spend", "importance": 35},
        segment_count=3,
        anomaly_count=150
    )
    
    # Combine for full narrative
    full_narrative = f"{exec_summary}\n\n### Model Insights\n\n{shap_explanation}"
    
    assert len(full_narrative) > 100, "Full narrative too short"
    assert "Monthly Spend" in full_narrative or "monthly" in full_narrative.lower() or "spend" in full_narrative.lower(), "Missing SHAP feature"
    assert "5" in full_narrative, "Missing row count indicator"
    print_result("NarrativeEngine + SHAP integration", True)
    results.append(("Integration test", True))
    
except Exception as e:
    print_result("Integration test", False, e)
    traceback.print_exc()
    results.append(("Integration test", False))

# =============================================================================
# SUMMARY
# =============================================================================
print_header("TEST SUMMARY")

passed = sum(1 for _, p in results if p)
failed = sum(1 for _, p in results if not p)
total = len(results)

print(f"\n  Total Tests: {total}")
print(f"  Passed: {passed}")
print(f"  Failed: {failed}")
print(f"  Pass Rate: {passed/total*100:.1f}%")

if failed > 0:
    print("\n  Failed Tests:")
    for name, p in results:
        if not p:
            print(f"    - {name}")

print(f"\n{'='*60}")
print(f"  {'✅ ALL TESTS PASSED' if failed == 0 else '❌ SOME TESTS FAILED'}")
print(f"{'='*60}\n")

sys.exit(0 if failed == 0 else 1)
