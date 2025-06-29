export interface BaseRule {
  id: string
  name: string
  description?: string
  enabled: boolean
  priority: number
  createdAt: Date
  updatedAt: Date
}

export interface CoRunRule extends BaseRule {
  type: "coRun"
  tasks: string[]
  mustRunTogether: boolean
}

export interface SlotRestrictionRule extends BaseRule {
  type: "slotRestriction"
  targetType: "client" | "worker"
  groupName: string
  minCommonSlots: number
  phases?: number[]
}

export interface LoadLimitRule extends BaseRule {
  type: "loadLimit"
  workerGroup: string
  maxSlotsPerPhase: number
  phases?: number[]
}

export interface PhaseWindowRule extends BaseRule {
  type: "phaseWindow"
  taskId: string
  allowedPhases: number[]
  strictMode: boolean
}

export interface PatternMatchRule extends BaseRule {
  type: "patternMatch"
  pattern: string
  field: string
  entityType: "clients" | "workers" | "tasks"
  action: "allow" | "deny" | "flag"
  parameters?: Record<string, any>
}

export interface PrecedenceRule extends BaseRule {
  type: "precedence"
  globalRules: string[]
  specificRules: string[]
  conflictResolution: "global" | "specific" | "merge"
}

export type Rule = CoRunRule | SlotRestrictionRule | LoadLimitRule | PhaseWindowRule | PatternMatchRule | PrecedenceRule

export interface RuleSet {
  version: string
  createdAt: Date
  rules: Rule[]
  metadata: {
    totalRules: number
    enabledRules: number
    ruleTypes: Record<string, number>
  }
}

export class RuleValidator {
  static validateRule(rule: Rule, existingRules: Rule[] = []): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Basic validation
    if (!rule.name.trim()) {
      errors.push("Rule name is required")
    }

    if (rule.priority < 1 || rule.priority > 100) {
      errors.push("Priority must be between 1 and 100")
    }

    // Type-specific validation
    switch (rule.type) {
      case "coRun":
        if (rule.tasks.length < 2) {
          errors.push("Co-run rules must include at least 2 tasks")
        }
        break

      case "slotRestriction":
        if (rule.minCommonSlots < 1) {
          errors.push("Minimum common slots must be at least 1")
        }
        break

      case "loadLimit":
        if (rule.maxSlotsPerPhase < 1) {
          errors.push("Maximum slots per phase must be at least 1")
        }
        break

      case "phaseWindow":
        if (rule.allowedPhases.length === 0) {
          errors.push("Phase window must include at least one phase")
        }
        break

      case "patternMatch":
        try {
          new RegExp(rule.pattern)
        } catch {
          errors.push("Invalid regex pattern")
        }
        break
    }

    // Check for conflicts with existing rules
    const conflicts = this.findConflicts(rule, existingRules)
    errors.push(...conflicts)

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static findConflicts(rule: Rule, existingRules: Rule[]): string[] {
    const conflicts: string[] = []

    existingRules.forEach((existingRule) => {
      if (existingRule.id === rule.id) return

      // Check for duplicate names
      if (existingRule.name === rule.name) {
        conflicts.push(`Rule name "${rule.name}" already exists`)
      }

      // Type-specific conflict detection
      if (rule.type === "coRun" && existingRule.type === "coRun") {
        const overlap = rule.tasks.some((task) => existingRule.tasks.includes(task))
        if (overlap) {
          conflicts.push(`Co-run rule conflicts with existing rule "${existingRule.name}"`)
        }
      }

      if (rule.type === "loadLimit" && existingRule.type === "loadLimit") {
        if (rule.workerGroup === existingRule.workerGroup) {
          conflicts.push(`Load limit for group "${rule.workerGroup}" already exists`)
        }
      }

      if (rule.type === "phaseWindow" && existingRule.type === "phaseWindow") {
        if (rule.taskId === existingRule.taskId) {
          conflicts.push(`Phase window for task "${rule.taskId}" already exists`)
        }
      }
    })

    return conflicts
  }

  static generateRuleSet(rules: Rule[]): RuleSet {
    const enabledRules = rules.filter((r) => r.enabled)
    const ruleTypes = rules.reduce(
      (acc, rule) => {
        acc[rule.type] = (acc[rule.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      version: "1.0.0",
      createdAt: new Date(),
      rules: enabledRules.sort((a, b) => b.priority - a.priority),
      metadata: {
        totalRules: rules.length,
        enabledRules: enabledRules.length,
        ruleTypes,
      },
    }
  }
}
