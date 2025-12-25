def compare(value, operator, target):
    if operator == "equals":
        return str(value).strip() == str(target).strip()
    if operator == "not_equals":
        return str(value).strip() != str(target).strip()
    if operator == "<":
        try:
            return float(value) < float(target)
        except:
            return False
    if operator == ">":
        try:
            return float(value) > float(target)
        except:
            return False
    if operator == "contains":
        return target in str(value)
    if operator == "starts_with":
        return str(value).startswith(str(target))

    # default fallback
    return False
