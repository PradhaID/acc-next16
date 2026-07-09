import { ObjectId } from "mongodb";

type FilterRule =
  | { type: "exact"; field?: string }
  | { type: "regex"; field?: string }
  | { type: "boolean"; field?: string; default?: boolean }
  | { type: "objectId"; field?: string }
  | { type: "dateRange"; startField?: string; endField?: string }
  | { type: "numberExact"; field?: string };

type FilterConfig = Record<string, FilterRule>;

export function buildFilter(searchParams: URLSearchParams, config: FilterConfig): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  for (const [param, rule] of Object.entries(config)) {
    const value = searchParams.get(param);
    if (rule.type === "dateRange") {
      const startField = rule.startField || "effectiveDate";
      const endField = rule.endField || "effectiveDate";
      if (param === "startDate" && value) {
        const existing = (filter[startField] as Record<string, unknown>) || {};
        existing.$gte = new Date(value);
        filter[startField] = existing;
      }
      if (param === "endDate" && value) {
        const end = new Date(value);
        end.setHours(23, 59, 59, 999);
        const existing = (filter[endField] as Record<string, unknown>) || {};
        existing.$lte = end;
        filter[endField] = existing;
      }
      continue;
    }

    const field = "field" in rule && rule.field ? rule.field : param;
    if (value === null) {
      if (rule.type === "boolean" && "default" in rule && rule.default !== undefined) {
        filter[field] = rule.default;
      }
      continue;
    }

    switch (rule.type) {
      case "exact":
        filter[field] = value;
        break;
      case "regex":
        filter[field] = { $regex: value, $options: "i" };
        break;
      case "boolean":
        filter[field] = value === "true";
        break;
      case "objectId":
        filter[field] = new ObjectId(value);
        break;
      case "numberExact":
        filter[field] = value;
        break;
    }
  }

  return filter;
}
