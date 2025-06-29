import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import type { Rule } from "./rule-types"
const model = openai("gpt-4o") 

export interface AIRecommendation {
  id: string
  type: "rule" | "data_correction" | "optimization" | "insight"
  title: string
  description: string
  confidence: number
  impact: "high" | "medium" | "low"
  category: string
  suggestedAction?: any
  reasoning: string
  autoApplicable: boolean
}

export interface DataPattern {
  field: string
  entityType: "clients" | "workers" | "tasks"
  pattern: string
  frequency: number
  examples: string[]
  suggestion: string
}

export class AIEngine {
  private clients: any[] = []
  private workers: any[] = []
  private tasks: any[] = []
  private existingRules: Rule[] = []

  constructor(clients: any[], workers: any[], tasks: any[], rules: Rule[] = []) {
    this.clients = clients
    this.workers = workers
    this.tasks = tasks
    this.existingRules = rules
  }

  // 1. Natural Language Rule Creation
  async parseNaturalLanguageRule(input: string): Promise<{
    success: boolean
    rule?: Partial<Rule>
    confidence: number
    explanation: string
  }> {
    try {
      const prompt = `
You are an expert business rule parser for resource allocation systems. 
Parse this natural language rule into a structured format.

Available rule types:
- coRun: Tasks that must/cannot run together
- slotRestriction: Minimum common slots for groups
- loadLimit: Maximum slots per phase for worker groups  
- phaseWindow: Allowed phases for specific tasks
- patternMatch: Pattern-based rules for entities

Available data context:
- Clients: ${this.clients.length} records with fields like ClientID, ClientName, PriorityLevel, GroupTag
- Workers: ${this.workers.length} records with fields like WorkerID, WorkerName, Skills, WorkerGroup, AvailableSlots
- Tasks: ${this.tasks.length} records with fields like TaskID, TaskName, Category, Duration, RequiredSkills

User input: "${input}"

Respond with JSON only:
{
  "ruleType": "coRun|slotRestriction|loadLimit|phaseWindow|patternMatch",
  "name": "descriptive rule name",
  "description": "what this rule does",
  "priority": 1-100,
  "parameters": {
    // rule-specific parameters based on type
  },
  "confidence": 0-100,
  "explanation": "why this interpretation makes sense"
}
`   

      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.3,
      })

      const parsed = JSON.parse(text)

      // Convert AI response to our Rule format
      const rule = this.convertAIResponseToRule(parsed)

      return {
        success: true,
        rule,
        confidence: parsed.confidence,
        explanation: parsed.explanation,
      }
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        explanation: `Failed to parse rule: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  // 2. AI Rule Recommendations
  async generateRuleRecommendations(): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    // Analyze data patterns
    const patterns = this.analyzeDataPatterns()

    // Generate recommendations based on patterns
    recommendations.push(...(await this.generatePatternBasedRecommendations(patterns)))
    recommendations.push(...(await this.generateWorkloadRecommendations()))
    recommendations.push(...(await this.generateSkillBasedRecommendations()))
    recommendations.push(...(await this.generatePhaseOptimizationRecommendations()))

    return recommendations.sort((a, b) => b.confidence - a.confidence)
  }

  // 3. Data Correction Suggestions
  async generateDataCorrections(): Promise<AIRecommendation[]> {
    const corrections: AIRecommendation[] = []

    // Skill standardization
    corrections.push(...this.detectSkillInconsistencies())

    // Missing data detection
    corrections.push(...this.detectMissingData())

    // Format inconsistencies
    corrections.push(...this.detectFormatInconsistencies())

    // Outlier detection
    corrections.push(...this.detectOutliers())

    return corrections.filter((c) => c.confidence > 60)
  }

  // 4. AI-Powered Insights
  async generateInsights(): Promise<AIRecommendation[]> {
    const insights: AIRecommendation[] = []

    // Resource utilization analysis
    insights.push(...this.analyzeResourceUtilization())

    // Bottleneck identification
    insights.push(...this.identifyBottlenecks())

    // Optimization opportunities
    insights.push(...this.findOptimizationOpportunities())

    return insights
  }

  // Helper Methods
  private convertAIResponseToRule(aiResponse: any): Partial<Rule> {
    const baseRule = {
      name: aiResponse.name,
      description: aiResponse.description,
      priority: aiResponse.priority || 50,
      enabled: true,
      type: aiResponse.ruleType,
    }

    switch (aiResponse.ruleType) {
      case "coRun":
        return {
          ...baseRule,
          tasks: aiResponse.parameters.tasks || [],
          mustRunTogether: aiResponse.parameters.mustRunTogether !== false,
        }

      case "loadLimit":
        return {
          ...baseRule,
          workerGroup: aiResponse.parameters.workerGroup,
          maxSlotsPerPhase: aiResponse.parameters.maxSlotsPerPhase || 3,
        }

      case "phaseWindow":
        return {
          ...baseRule,
          taskId: aiResponse.parameters.taskId,
          allowedPhases: aiResponse.parameters.allowedPhases || [],
          strictMode: aiResponse.parameters.strictMode || false,
        }

      default:
        return baseRule
    }
  }

  private analyzeDataPatterns(): DataPattern[] {
    const patterns: DataPattern[] = []

    // Analyze skill patterns
    const skillPatterns = this.analyzeSkillPatterns()
    patterns.push(...skillPatterns)

    // Analyze naming patterns
    const namingPatterns = this.analyzeNamingPatterns()
    patterns.push(...namingPatterns)

    return patterns
  }

  private analyzeSkillPatterns(): DataPattern[] {
    const patterns: DataPattern[] = []
    const skillMap = new Map<string, string[]>()

    this.workers.forEach((worker) => {
      if (worker.Skills) {
        const skills =
          typeof worker.Skills === "string" ? worker.Skills.split(",").map((s: string) => s.trim()) : worker.Skills

        skills.forEach((skill: string) => {
          const normalized = skill.toLowerCase()
          if (!skillMap.has(normalized)) {
            skillMap.set(normalized, [])
          }
          skillMap.get(normalized)!.push(skill)
        })
      }
    })

    // Find skill variations
    skillMap.forEach((variations, normalized) => {
      if (variations.length > 1) {
        const uniqueVariations = [...new Set(variations)]
        if (uniqueVariations.length > 1) {
          patterns.push({
            field: "Skills",
            entityType: "workers",
            pattern: `Skill variations for "${normalized}"`,
            frequency: variations.length,
            examples: uniqueVariations.slice(0, 3),
            suggestion: `Standardize to "${uniqueVariations[0]}"`,
          })
        }
      }
    })

    return patterns
  }

  private analyzeNamingPatterns(): DataPattern[] {
    const patterns: DataPattern[] = []

    // Analyze task naming patterns
    const taskCategories = new Map<string, number>()
    this.tasks.forEach((task) => {
      if (task.TaskName) {
        const words = task.TaskName.toLowerCase().split(/\s+/)
        words.forEach((word: string) => {
          if (word.length > 3) {
            taskCategories.set(word, (taskCategories.get(word) || 0) + 1)
          }
        })
      }
    })

    return patterns
  }

  private async generatePatternBasedRecommendations(patterns: DataPattern[]): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    patterns.forEach((pattern) => {
      if (pattern.frequency > 2) {
        recommendations.push({
          id: `pattern_${Date.now()}_${Math.random()}`,
          type: "data_correction",
          title: `Standardize ${pattern.field}`,
          description: pattern.suggestion,
          confidence: Math.min(90, pattern.frequency * 10),
          impact: pattern.frequency > 5 ? "high" : "medium",
          category: "Data Quality",
          reasoning: `Found ${pattern.frequency} instances of ${pattern.pattern}`,
          autoApplicable: true,
          suggestedAction: {
            type: "standardize",
            field: pattern.field,
            entityType: pattern.entityType,
            examples: pattern.examples,
          },
        })
      }
    })

    return recommendations
  }

  private async generateWorkloadRecommendations(): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    // Analyze worker loads
    const workerLoads = new Map<string, number>()
    this.workers.forEach((worker) => {
      const maxLoad = worker.MaxLoadPerPhase || 1
      const availableSlots = worker.AvailableSlots
      let slotCount = 0

      if (Array.isArray(availableSlots)) {
        slotCount = availableSlots.length
      } else if (typeof availableSlots === "string") {
        try {
          const parsed = JSON.parse(availableSlots)
          slotCount = Array.isArray(parsed) ? parsed.length : 0
        } catch {
          slotCount = 0
        }
      }

      if (maxLoad > slotCount && slotCount > 0) {
        workerLoads.set(worker.WorkerID, maxLoad / slotCount)
      }
    })

    // Find overloaded workers
    workerLoads.forEach((ratio, workerId) => {
      if (ratio > 1.5) {
        recommendations.push({
          id: `workload_${workerId}`,
          type: "rule",
          title: `Reduce load for worker ${workerId}`,
          description: `Worker ${workerId} has MaxLoadPerPhase (${Math.round(ratio * 100)}%) higher than available slots`,
          confidence: 85,
          impact: "high",
          category: "Workload Management",
          reasoning: `Load ratio of ${ratio.toFixed(2)} indicates potential overallocation`,
          autoApplicable: true,
          suggestedAction: {
            type: "loadLimit",
            workerId,
            suggestedMaxLoad: Math.floor(ratio),
          },
        })
      }
    })

    return recommendations
  }

  private async generateSkillBasedRecommendations(): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    // Analyze skill coverage
    const requiredSkills = new Set<string>()
    const availableSkills = new Set<string>()

    this.tasks.forEach((task) => {
      if (task.RequiredSkills) {
        const skills =
          typeof task.RequiredSkills === "string"
            ? task.RequiredSkills.split(",").map((s: string) => s.trim())
            : task.RequiredSkills
        skills.forEach((skill: string) => requiredSkills.add(skill.toLowerCase()))
      }
    })

    this.workers.forEach((worker) => {
      if (worker.Skills) {
        const skills =
          typeof worker.Skills === "string" ? worker.Skills.split(",").map((s: string) => s.trim()) : worker.Skills
        skills.forEach((skill: string) => availableSkills.add(skill.toLowerCase()))
      }
    })

    // Find missing skills
    const missingSkills = Array.from(requiredSkills).filter((skill) => !availableSkills.has(skill))

    if (missingSkills.length > 0) {
      recommendations.push({
        id: `skills_gap_${Date.now()}`,
        type: "insight",
        title: "Skill Gap Detected",
        description: `${missingSkills.length} required skills are not available in your worker pool`,
        confidence: 95,
        impact: "high",
        category: "Skill Management",
        reasoning: `Tasks require skills that no workers possess: ${missingSkills.join(", ")}`,
        autoApplicable: false,
        suggestedAction: {
          type: "skill_gap",
          missingSkills,
        },
      })
    }

    return recommendations
  }

  private async generatePhaseOptimizationRecommendations(): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = []

    // Analyze phase distribution
    const phaseDemand = new Map<number, number>()
    const phaseCapacity = new Map<number, number>()

    // Calculate demand per phase
    this.tasks.forEach((task) => {
      const duration = task.Duration || 1
      const phases = task.PreferredPhases

      if (phases) {
        let phaseList: number[] = []
        if (Array.isArray(phases)) {
          phaseList = phases
        } else if (typeof phases === "string") {
          try {
            phaseList = JSON.parse(phases)
          } catch {
            // Handle range format like "1-3"
            if (phases.includes("-")) {
              const [start, end] = phases.split("-").map(Number)
              phaseList = Array.from({ length: end - start + 1 }, (_, i) => start + i)
            }
          }
        }

        phaseList.forEach((phase) => {
          phaseDemand.set(phase, (phaseDemand.get(phase) || 0) + duration)
        })
      }
    })

    // Calculate capacity per phase
    this.workers.forEach((worker) => {
      const maxLoad = worker.MaxLoadPerPhase || 1
      const slots = worker.AvailableSlots

      if (slots) {
        let slotList: number[] = []
        if (Array.isArray(slots)) {
          slotList = slots
        } else if (typeof slots === "string") {
          try {
            slotList = JSON.parse(slots)
          } catch {
            // Skip malformed slots
          }
        }

        slotList.forEach((phase) => {
          phaseCapacity.set(phase, (phaseCapacity.get(phase) || 0) + maxLoad)
        })
      }
    })

    // Find imbalanced phases
    phaseDemand.forEach((demand, phase) => {
      const capacity = phaseCapacity.get(phase) || 0
      const utilization = capacity > 0 ? demand / capacity : Number.POSITIVE_INFINITY

      if (utilization > 0.9) {
        recommendations.push({
          id: `phase_${phase}_overload`,
          type: "optimization",
          title: `Phase ${phase} Overloaded`,
          description: `Phase ${phase} has ${Math.round(utilization * 100)}% utilization`,
          confidence: 90,
          impact: utilization > 1.2 ? "high" : "medium",
          category: "Phase Optimization",
          reasoning: `Demand (${demand}) vs Capacity (${capacity}) = ${utilization.toFixed(2)} ratio`,
          autoApplicable: false,
          suggestedAction: {
            type: "phase_rebalance",
            phase,
            demand,
            capacity,
            utilization,
          },
        })
      }
    })

    return recommendations
  }

  private detectSkillInconsistencies(): AIRecommendation[] {
    const recommendations: AIRecommendation[] = []
    const skillVariations = new Map<string, Set<string>>()

    // Collect skill variations
    this.workers.forEach((worker) => {
      if (worker.Skills) {
        const skills =
          typeof worker.Skills === "string" ? worker.Skills.split(",").map((s: string) => s.trim()) : worker.Skills

        skills.forEach((skill: string) => {
          const normalized = skill.toLowerCase().replace(/[^a-z0-9]/g, "")
          if (!skillVariations.has(normalized)) {
            skillVariations.set(normalized, new Set())
          }
          skillVariations.get(normalized)!.add(skill)
        })
      }
    })

    // Find inconsistencies
    skillVariations.forEach((variations, normalized) => {
      if (variations.size > 1) {
        const variationArray = Array.from(variations)
        recommendations.push({
          id: `skill_inconsistency_${normalized}`,
          type: "data_correction",
          title: `Standardize "${normalized}" skill variations`,
          description: `Found ${variations.size} different ways to write this skill`,
          confidence: 80,
          impact: "medium",
          category: "Data Standardization",
          reasoning: `Variations found: ${variationArray.join(", ")}`,
          autoApplicable: true,
          suggestedAction: {
            type: "standardize_skill",
            variations: variationArray,
            suggested: variationArray[0], // Use most common or first
          },
        })
      }
    })

    return recommendations
  }

  private detectMissingData(): AIRecommendation[] {
    const recommendations: AIRecommendation[] = []

    // Check for missing required fields
    const requiredFields = {
      clients: ["ClientID", "ClientName", "PriorityLevel"],
      workers: ["WorkerID", "WorkerName", "Skills"],
      tasks: ["TaskID", "TaskName", "Duration"],
    }

    Object.entries(requiredFields).forEach(([entityType, fields]) => {
      const data = entityType === "clients" ? this.clients : entityType === "workers" ? this.workers : this.tasks

      fields.forEach((field) => {
        const missingCount = data.filter((item) => !item[field] || item[field] === "").length

        if (missingCount > 0) {
          recommendations.push({
            id: `missing_${entityType}_${field}`,
            type: "data_correction",
            title: `Missing ${field} in ${entityType}`,
            description: `${missingCount} ${entityType} records are missing ${field}`,
            confidence: 95,
            impact: missingCount > data.length * 0.1 ? "high" : "medium",
            category: "Data Completeness",
            reasoning: `${missingCount}/${data.length} records missing required field`,
            autoApplicable: false,
            suggestedAction: {
              type: "fill_missing",
              entityType,
              field,
              missingCount,
            },
          })
        }
      })
    })

    return recommendations
  }

  private detectFormatInconsistencies(): AIRecommendation[] {
    const recommendations: AIRecommendation[] = []

    // Check ID format consistency
    const idPatterns = {
      clients: this.clients.map((c) => c.ClientID).filter(Boolean),
      workers: this.workers.map((w) => w.WorkerID).filter(Boolean),
      tasks: this.tasks.map((t) => t.TaskID).filter(Boolean),
    }

    Object.entries(idPatterns).forEach(([entityType, ids]) => {
      if (ids.length > 1) {
        const patterns = new Set(ids.map((id) => String(id).replace(/\d+/g, "#")));

        if (patterns.size > 1) {
          recommendations.push({
            id: `id_format_${entityType}`,
            type: "data_correction",
            title: `Inconsistent ${entityType} ID format`,
            description: `Found ${patterns.size} different ID patterns`,
            confidence: 75,
            impact: "low",
            category: "Format Consistency",
            reasoning: `Patterns: ${Array.from(patterns).join(", ")}`,
            autoApplicable: false,
            suggestedAction: {
              type: "standardize_format",
              entityType,
              patterns: Array.from(patterns),
            },
          })
        }
      }
    })

    return recommendations
  }

  private detectOutliers(): AIRecommendation[] {
    const recommendations: AIRecommendation[] = []

    // Check for duration outliers
    const durations = this.tasks.map((t) => t.Duration).filter((d) => d && d > 0)
    if (durations.length > 3) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      const outliers = durations.filter((d) => d > avg * 3 || d < avg / 3)

      if (outliers.length > 0) {
        recommendations.push({
          id: `duration_outliers`,
          type: "data_correction",
          title: "Task duration outliers detected",
          description: `${outliers.length} tasks have unusual durations`,
          confidence: 70,
          impact: "medium",
          category: "Data Quality",
          reasoning: `Average duration: ${avg.toFixed(1)}, outliers: ${outliers.join(", ")}`,
          autoApplicable: false,
          suggestedAction: {
            type: "review_outliers",
            field: "Duration",
            outliers,
            average: avg,
          },
        })
      }
    }

    return recommendations
  }

  private analyzeResourceUtilization(): AIRecommendation[] {
    const recommendations: AIRecommendation[] = []

    // Calculate overall utilization
    const totalWorkerCapacity = this.workers.reduce((sum, worker) => {
      const maxLoad = worker.MaxLoadPerPhase || 1
      const slots = worker.AvailableSlots
      let slotCount = 0

      if (Array.isArray(slots)) {
        slotCount = slots.length
      } else if (typeof slots === "string") {
        try {
          const parsed = JSON.parse(slots)
          slotCount = Array.isArray(parsed) ? parsed.length : 0
        } catch {
          slotCount = 1
        }
      }

      return sum + maxLoad * slotCount
    }, 0)

    const totalTaskDemand = this.tasks.reduce((sum, task) => sum + (task.Duration || 1), 0)
    const utilization = totalWorkerCapacity > 0 ? totalTaskDemand / totalWorkerCapacity : 0

    if (utilization < 0.5) {
      recommendations.push({
        id: "low_utilization",
        type: "insight",
        title: "Low Resource Utilization",
        description: `Only ${Math.round(utilization * 100)}% of worker capacity is being used`,
        confidence: 85,
        impact: "medium",
        category: "Resource Optimization",
        reasoning: `Total demand (${totalTaskDemand}) vs capacity (${totalWorkerCapacity})`,
        autoApplicable: false,
        suggestedAction: {
          type: "optimize_utilization",
          utilization,
          suggestion: "Consider reducing worker capacity or adding more tasks",
        },
      })
    } else if (utilization > 0.9) {
      recommendations.push({
        id: "high_utilization",
        type: "insight",
        title: "High Resource Utilization",
        description: `${Math.round(utilization * 100)}% of worker capacity is being used`,
        confidence: 90,
        impact: "high",
        category: "Resource Optimization",
        reasoning: `Total demand (${totalTaskDemand}) vs capacity (${totalWorkerCapacity})`,
        autoApplicable: false,
        suggestedAction: {
          type: "optimize_utilization",
          utilization,
          suggestion: "Consider adding more workers or reducing task scope",
        },
      })
    }

    return recommendations
  }

  private identifyBottlenecks(): AIRecommendation[] {
    const recommendations: AIRecommendation[] = []

    // Find skill bottlenecks
    const skillDemand = new Map<string, number>()
    const skillSupply = new Map<string, number>()

    // Calculate skill demand
    this.tasks.forEach((task) => {
      if (task.RequiredSkills) {
        const skills =
          typeof task.RequiredSkills === "string"
            ? task.RequiredSkills.split(",").map((s: string) => s.trim())
            : task.RequiredSkills

        skills.forEach((skill: string) => {
          const normalized = skill.toLowerCase()
          skillDemand.set(normalized, (skillDemand.get(normalized) || 0) + (task.Duration || 1))
        })
      }
    })

    // Calculate skill supply
    this.workers.forEach((worker) => {
      if (worker.Skills) {
        const skills =
          typeof worker.Skills === "string" ? worker.Skills.split(",").map((s: string) => s.trim()) : worker.Skills

        const capacity = worker.MaxLoadPerPhase || 1
        skills.forEach((skill: string) => {
          const normalized = skill.toLowerCase()
          skillSupply.set(normalized, (skillSupply.get(normalized) || 0) + capacity)
        })
      }
    })

    // Find bottlenecks
    skillDemand.forEach((demand, skill) => {
      const supply = skillSupply.get(skill) || 0
      const ratio = supply > 0 ? demand / supply : Number.POSITIVE_INFINITY

      if (ratio > 1.2) {
        recommendations.push({
          id: `bottleneck_${skill}`,
          type: "insight",
          title: `Skill Bottleneck: ${skill}`,
          description: `Demand for ${skill} exceeds supply by ${Math.round((ratio - 1) * 100)}%`,
          confidence: 85,
          impact: "high",
          category: "Bottleneck Analysis",
          reasoning: `Demand: ${demand}, Supply: ${supply}, Ratio: ${ratio.toFixed(2)}`,
          autoApplicable: false,
          suggestedAction: {
            type: "resolve_bottleneck",
            skill,
            demand,
            supply,
            suggestion: "Add more workers with this skill or reduce task requirements",
          },
        })
      }
    })

    return recommendations
  }

  private findOptimizationOpportunities(): AIRecommendation[] {
    const recommendations: AIRecommendation[] = []

    // Find workers with overlapping skills that could be consolidated
    const skillGroups = new Map<string, string[]>()

    this.workers.forEach((worker) => {
      if (worker.Skills) {
        const skills =
          typeof worker.Skills === "string"
            ? worker.Skills.split(",").map((s: string) => s.trim().toLowerCase())
            : worker.Skills.map((s: string) => s.toLowerCase())

        const skillKey = skills.sort().join(",")
        if (!skillGroups.has(skillKey)) {
          skillGroups.set(skillKey, [])
        }
        skillGroups.get(skillKey)!.push(worker.WorkerID)
      }
    })

    // Find groups with multiple workers (potential for optimization)
    skillGroups.forEach((workerIds, skillKey) => {
      if (workerIds.length > 2) {
        recommendations.push({
          id: `optimization_${skillKey.replace(/,/g, "_")}`,
          type: "optimization",
          title: `Optimize workers with identical skills`,
          description: `${workerIds.length} workers have identical skill sets: ${skillKey}`,
          confidence: 70,
          impact: "medium",
          category: "Resource Optimization",
          reasoning: `Workers ${workerIds.join(", ")} could potentially be consolidated or specialized`,
          autoApplicable: false,
          suggestedAction: {
            type: "optimize_workers",
            workerIds,
            skills: skillKey.split(","),
            suggestion: "Consider specializing some workers or redistributing tasks",
          },
        })
      }
    })

    return recommendations
  }
}
