
import sys
import os

# Add backend to path
sys.path.append('backend')

print("Checking imports...")
try:
    import anti_gravity.utils.presets
    print("✅ anti_gravity.utils.presets imported")
except ImportError as e:
    print(f"❌ Failed to import presets: {e}")

try:
    import anti_gravity.core.regression
    print("✅ anti_gravity.core.regression imported")
except ImportError as e:
    print(f"❌ Failed to import core.regression: {e}")

try:
    import anti_gravity.agents.regression
    print("✅ anti_gravity.agents.regression imported")
except ImportError as e:
    print(f"❌ Failed to import agents.regression: {e}")

try:
    # regression_view imports streamlit, pandas, altair
    import anti_gravity.ui.regression_view
    print("✅ anti_gravity.ui.regression_view imported")
except ImportError as e:
    print(f"❌ Failed to import regression_view: {e}")

try:
    import anti_gravity.ui.comparison_view
    print("✅ anti_gravity.ui.comparison_view imported")
except ImportError as e:
    print(f"❌ Failed to import comparison_view: {e}")

print("Verification complete.")
