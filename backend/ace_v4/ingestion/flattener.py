class Flattener:
    def flatten_record(self, record: dict, parent_key="", result=None):
        if result is None:
            result = {}

        for key, value in record.items():
            full_key = f"{parent_key}.{key}" if parent_key else key

            if isinstance(value, dict):
                self.flatten_record(value, full_key, result)
            elif isinstance(value, list):
                for idx, item in enumerate(value):
                    if isinstance(item, dict):
                        self.flatten_record(item, f"{full_key}.{idx}", result)
                    else:
                        result[f"{full_key}.{idx}"] = item
            else:
                result[full_key] = value

        return result

    def flatten_records(self, records):
        return [self.flatten_record(r) for r in records]
