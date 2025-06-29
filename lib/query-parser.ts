export interface QueryFilter {
  field: string
  operator: "equals" | "contains" | "greater" | "less" | "greaterEqual" | "lessEqual" | "in" | "notIn"
  value: any
  entityType?: "clients" | "workers" | "tasks"
}

export interface ParsedQuery {
  filters: QueryFilter[]
  entityTypes: ("clients" | "workers" | "tasks")[]
  searchTerms: string[]
  confidence: number
  originalQuery: string
}

export class QueryParser {
  private patterns = [
    // Entity type patterns
    { pattern: /\b(client|clients)\b/i, type: "entity", value: "clients" },
    { pattern: /\b(worker|workers|employee|employees)\b/i, type: "entity", value: "workers" },
    { pattern: /\b(task|tasks|job|jobs)\b/i, type: "entity", value: "tasks" },

    // Field patterns
    { pattern: /\b(priority|priority level)\b/i, type: "field", value: "PriorityLevel" },
    { pattern: /\b(duration|time|hours)\b/i, type: "field", value: "Duration" },
    { pattern: /\b(skill|skills|expertise)\b/i, type: "field", value: "Skills" },
    { pattern: /\b(name|names)\b/i, type: "field", value: "Name" },
    { pattern: /\b(available|availability|slots)\b/i, type: "field", value: "AvailableSlots" },
    { pattern: /\b(phase|phases)\b/i, type: "field", value: "PreferredPhases" },
    { pattern: /\b(group|groups|team)\b/i, type: "field", value: "Group" },
    { pattern: /\b(load|capacity|max load)\b/i, type: "field", value: "MaxLoadPerPhase" },
    { pattern: /\b(concurrent|concurrency|parallel)\b/i, type: "field", value: "MaxConcurrent" },

    // Operator patterns
    { pattern: /\b(greater than|more than|above|over|>)\s*(\d+)/i, type: "operator", value: "greater" },
    { pattern: /\b(less than|fewer than|below|under|<)\s*(\d+)/i, type: "operator", value: "less" },
    { pattern: /\b(equal to|equals|is|=)\s*(\d+|"[^"]*"|'[^']*')/i, type: "operator", value: "equals" },
    { pattern: /\b(contains|has|includes|with)\s+([a-zA-Z0-9\s,]+)/i, type: "operator", value: "contains" },
    { pattern: /\b(in|within)\s+(phase|phases)\s*(\d+(?:\s*,\s*\d+)*)/i, type: "operator", value: "in" },

    // Value patterns
    { pattern: /\b(\d+)\b/g, type: "number", value: null },
    { pattern: /"([^"]*)"/g, type: "string", value: null },
    { pattern: /'([^']*)'/g, type: "string", value: null },
    { pattern: /\b(javascript|react|python|java|node\.?js|django|spring|swift|ios)\b/gi, type: "skill", value: null },
    { pattern: /\b(frontend|backend|fullstack|mobile|web)\b/gi, type: "category", value: null },
  ]

  parse(query: string): ParsedQuery {
    const result: ParsedQuery = {
      filters: [],
      entityTypes: [],
      searchTerms: [],
      confidence: 0,
      originalQuery: query,
    }

    const lowerQuery = query.toLowerCase()
    let confidence = 0

    // Extract entity types
    this.patterns
      .filter((p) => p.type === "entity")
      .forEach((pattern) => {
        if (pattern.pattern.test(query)) {
          result.entityTypes.push(pattern.value as any)
          confidence += 20
        }
      })

    // If no specific entity mentioned, include all
    if (result.entityTypes.length === 0) {
      result.entityTypes = ["clients", "workers", "tasks"]
    }

    // Parse complex queries
    this.parseComplexQueries(query, result)

    // Parse simple keyword searches
    this.parseKeywordSearch(query, result)

    // Calculate confidence
    result.confidence = Math.min(confidence + result.filters.length * 15, 100)

    return result
  }

  private parseComplexQueries(query: string, result: ParsedQuery) {
    // Pattern: "workers with JavaScript skills"
    const skillPattern =
      /\b(workers?|employees?)\s+(?:with|having|who\s+(?:have|know))\s+([a-zA-Z0-9\s,]+)\s+(?:skill|skills|expertise)/i
    const skillMatch = skillPattern.exec(query)
    if (skillMatch) {
      const skills = skillMatch[2].split(/[,\s]+/).filter(Boolean)
      result.filters.push({
        field: "Skills",
        operator: "contains",
        value: skills.join(","),
        entityType: "workers",
      })
      result.entityTypes = ["workers"]
    }

    // Pattern: "tasks with duration greater than 2"
    const durationPattern =
      /\b(tasks?)\s+(?:with|having)\s+(?:duration|time)\s+(?:greater than|more than|above|over|>)\s+(\d+)/i
    const durationMatch = durationPattern.exec(query)
    if (durationMatch) {
      result.filters.push({
        field: "Duration",
        operator: "greater",
        value: Number.parseInt(durationMatch[2]),
        entityType: "tasks",
      })
      result.entityTypes = ["tasks"]
    }

    // Pattern: "clients with priority level above 3"
    const priorityPattern =
      /\b(clients?)\s+(?:with|having)\s+(?:priority|priority\s+level)\s+(?:above|over|greater\s+than|>)\s+(\d+)/i
    const priorityMatch = priorityPattern.exec(query)
    if (priorityMatch) {
      result.filters.push({
        field: "PriorityLevel",
        operator: "greater",
        value: Number.parseInt(priorityMatch[2]),
        entityType: "clients",
      })
      result.entityTypes = ["clients"]
    }

    // Pattern: "workers available in phase 2"
    const phasePattern = /\b(workers?)\s+(?:available|working)\s+(?:in|during)\s+phase\s+(\d+)/i
    const phaseMatch = phasePattern.exec(query)
    if (phaseMatch) {
      result.filters.push({
        field: "AvailableSlots",
        operator: "contains",
        value: Number.parseInt(phaseMatch[2]),
        entityType: "workers",
      })
      result.entityTypes = ["workers"]
    }

    // Pattern: "tasks in mobile category"
    const categoryPattern = /\b(tasks?)\s+(?:in|from|of)\s+(?:category\s+)?([a-zA-Z]+)/i
    const categoryMatch = categoryPattern.exec(query)
    if (categoryMatch) {
      result.filters.push({
        field: "Category",
        operator: "contains",
        value: categoryMatch[2],
        entityType: "tasks",
      })
      result.entityTypes = ["tasks"]
    }

    // Pattern: "overloaded workers"
    if (/\b(?:overloaded|overworked|busy)\s+workers?\b/i.test(query)) {
      result.filters.push({
        field: "MaxLoadPerPhase",
        operator: "greater",
        value: 3, // Assume > 3 is overloaded
        entityType: "workers",
      })
      result.entityTypes = ["workers"]
    }

    // Pattern: "high priority clients"
    if (/\b(?:high|top)\s+priority\s+clients?\b/i.test(query)) {
      result.filters.push({
        field: "PriorityLevel",
        operator: "greaterEqual",
        value: 4,
        entityType: "clients",
      })
      result.entityTypes = ["clients"]
    }

    // Pattern: "backend workers" or "frontend developers"
    const groupPattern = /\b(backend|frontend|fullstack|mobile)\s+(?:workers?|developers?|employees?)/i
    const groupMatch = groupPattern.exec(query)
    if (groupMatch) {
      result.filters.push({
        field: "WorkerGroup",
        operator: "contains",
        value: groupMatch[1],
        entityType: "workers",
      })
      result.entityTypes = ["workers"]
    }
  }

  private parseKeywordSearch(query: string, result: ParsedQuery) {
    // Extract potential search terms
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .filter((word) => !["the", "and", "or", "with", "have", "has", "are", "is", "was", "were"].includes(word))

    result.searchTerms = words
  }

  // Generate search suggestions based on data
  generateSuggestions(clients: any[], workers: any[], tasks: any[]): string[] {
    const suggestions = [
      // Basic entity queries
      "Show all clients",
      "List all workers",
      "Display all tasks",

      // Priority-based queries
      "High priority clients",
      "Clients with priority above 3",
      "Low priority tasks",

      // Skill-based queries
      "Workers with JavaScript skills",
      "Workers who know React",
      "Backend developers",
      "Frontend workers",

      // Duration and time queries
      "Tasks with duration greater than 2",
      "Long running tasks",
      "Quick tasks under 1 hour",

      // Phase and availability queries
      "Workers available in phase 2",
      "Tasks scheduled for phase 1",
      "Workers working in multiple phases",

      // Workload queries
      "Overloaded workers",
      "Workers with high capacity",
      "Available workers",

      // Category queries
      "Mobile development tasks",
      "Web development projects",
      "Database tasks",

      // Complex queries
      "Workers with React skills available in phase 2",
      "High priority clients requesting mobile tasks",
      "Backend workers with Python expertise",
      "Tasks requiring JavaScript and lasting more than 3 hours",
    ]

    // Add dynamic suggestions based on actual data
    const dynamicSuggestions: string[] = []

    // Add skill-based suggestions
    const allSkills = new Set<string>()
    workers.forEach((worker) => {
      if (worker.Skills) {
        const skills = typeof worker.Skills === "string" ? worker.Skills.split(",") : worker.Skills
        skills.forEach((skill: string) => allSkills.add(skill.trim()))
      }
    })

    allSkills.forEach((skill) => {
      if (skill.length > 0) {
        dynamicSuggestions.push(`Workers with ${skill} skills`)
        dynamicSuggestions.push(`Tasks requiring ${skill}`)
      }
    })

    // Add category-based suggestions
    const allCategories = new Set<string>()
    tasks.forEach((task) => {
      if (task.Category) {
        allCategories.add(task.Category)
      }
    })

    allCategories.forEach((category) => {
      dynamicSuggestions.push(`${category} tasks`)
    })

    return [...suggestions, ...dynamicSuggestions].slice(0, 20) // Limit to 20 suggestions
  }
}
