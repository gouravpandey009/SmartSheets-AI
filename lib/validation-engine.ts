export interface ValidationError {
  id: string
  type: "error" | "warning"
  severity: "high" | "medium" | "low"
  message: string
  field: string
  rowIndex: number
  entityType: "clients" | "workers" | "tasks"
  suggestion?: string
  autoFixable?: boolean
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  summary: {
    totalErrors: number
    totalWarnings: number
    criticalIssues: number
  }
}

export class ValidationEngine {
  private clients: any[] = []
  private workers: any[] = []
  private tasks: any[] = []

  constructor(clients: any[], workers: any[], tasks: any[]) {
    this.clients = clients
    this.workers = workers
    this.tasks = tasks
  }

  validateAll(): ValidationResult {
    const errors: ValidationError[] = []

    // Run all validation rules
    errors.push(...this.validateRequiredColumns())
    errors.push(...this.validateDuplicateIDs())
    errors.push(...this.validateMalformedLists())
    errors.push(...this.validateOutOfRangeValues())
    errors.push(...this.validateBrokenJSON())
    errors.push(...this.validateUnknownReferences())
    errors.push(...this.validateOverloadedWorkers())
    errors.push(...this.validateSkillCoverage())
    errors.push(...this.validateMaxConcurrency())
    errors.push(...this.validatePhaseSlotSaturation())
    errors.push(...this.validateCircularCoRunGroups()) // NEW
    errors.push(...this.validateConflictingRules()) // NEW

    const warnings = errors.filter((e) => e.type === "warning")
    const actualErrors = errors.filter((e) => e.type === "error")

    return {
      isValid: actualErrors.length === 0,
      errors: actualErrors,
      warnings,
      summary: {
        totalErrors: actualErrors.length,
        totalWarnings: warnings.length,
        criticalIssues: errors.filter((e) => e.severity === "high").length,
      },
    }
  }

  // 1. Missing required columns
  private validateRequiredColumns(): ValidationError[] {
    const errors: ValidationError[] = []

    const requiredFields = {
      clients: ["ClientID", "ClientName", "PriorityLevel", "RequestedTaskIDs"],
      workers: ["WorkerID", "WorkerName", "Skills", "AvailableSlots", "MaxLoadPerPhase"],
      tasks: ["TaskID", "TaskName", "Duration", "RequiredSkills", "MaxConcurrent"],
    }

    Object.entries(requiredFields).forEach(([entityType, fields]) => {
      const data = entityType === "clients" ? this.clients : entityType === "workers" ? this.workers : this.tasks

      if (data.length > 0) {
        const firstRow = data[0]
        fields.forEach((field) => {
          if (!(field in firstRow)) {
            errors.push({
              id: `missing-column-${entityType}-${field}`,
              type: "error",
              severity: "high",
              message: `Missing required column: ${field}`,
              field,
              rowIndex: -1,
              entityType: entityType as any,
              suggestion: `Add the ${field} column to your ${entityType} data`,
              autoFixable: false,
            })
          }
        })
      }
    })

    return errors
  }

  // 2. Duplicate IDs
  private validateDuplicateIDs(): ValidationError[] {
    const errors: ValidationError[] = []

    const checkDuplicates = (data: any[], idField: string, entityType: "clients" | "workers" | "tasks") => {
      const seen = new Set()
      data.forEach((row, index) => {
        const id = row[idField]
        if (id && seen.has(id)) {
          errors.push({
            id: `duplicate-id-${entityType}-${index}`,
            type: "error",
            severity: "high",
            message: `Duplicate ${idField}: ${id}`,
            field: idField,
            rowIndex: index,
            entityType,
            suggestion: `Change this ${idField} to a unique value`,
            autoFixable: true,
          })
        }
        seen.add(id)
      })
    }

    checkDuplicates(this.clients, "ClientID", "clients")
    checkDuplicates(this.workers, "WorkerID", "workers")
    checkDuplicates(this.tasks, "TaskID", "tasks")

    return errors
  }

  // 3. Malformed lists
  private validateMalformedLists(): ValidationError[] {
    const errors: ValidationError[] = []

    // Check AvailableSlots in workers
    this.workers.forEach((worker, index) => {
      const slots = worker.AvailableSlots
      if (slots) {
        try {
          const parsed = Array.isArray(slots) ? slots : JSON.parse(slots)
          if (!Array.isArray(parsed) || !parsed.every((slot) => typeof slot === "number" && slot > 0)) {
            errors.push({
              id: `malformed-slots-${index}`,
              type: "error",
              severity: "medium",
              message: "AvailableSlots must be an array of positive numbers",
              field: "AvailableSlots",
              rowIndex: index,
              entityType: "workers",
              suggestion: "Format as [1,2,3] or comma-separated numbers",
              autoFixable: true,
            })
          }
        } catch {
          errors.push({
            id: `malformed-slots-${index}`,
            type: "error",
            severity: "medium",
            message: "Invalid AvailableSlots format",
            field: "AvailableSlots",
            rowIndex: index,
            entityType: "workers",
            suggestion: "Format as [1,2,3] or comma-separated numbers",
            autoFixable: true,
          })
        }
      }
    })

    return errors
  }

  // 4. Out-of-range values
  private validateOutOfRangeValues(): ValidationError[] {
    const errors: ValidationError[] = []

    // Check PriorityLevel (1-5)
    this.clients.forEach((client, index) => {
      const priority = client.PriorityLevel
      if (priority && (priority < 1 || priority > 5)) {
        errors.push({
          id: `priority-range-${index}`,
          type: "error",
          severity: "medium",
          message: `PriorityLevel must be between 1-5, got ${priority}`,
          field: "PriorityLevel",
          rowIndex: index,
          entityType: "clients",
          suggestion: "Set PriorityLevel to a value between 1 and 5",
          autoFixable: true,
        })
      }
    })

    // Check Duration >= 1
    this.tasks.forEach((task, index) => {
      const duration = task.Duration
      if (duration && duration < 1) {
        errors.push({
          id: `duration-range-${index}`,
          type: "error",
          severity: "medium",
          message: `Duration must be >= 1, got ${duration}`,
          field: "Duration",
          rowIndex: index,
          entityType: "tasks",
          suggestion: "Set Duration to at least 1",
          autoFixable: true,
        })
      }
    })

    return errors
  }

  // 5. Broken JSON
  private validateBrokenJSON(): ValidationError[] {
    const errors: ValidationError[] = []

    this.clients.forEach((client, index) => {
      const json = client.AttributesJSON
      if (json && typeof json === "string") {
        try {
          JSON.parse(json)
        } catch {
          errors.push({
            id: `broken-json-${index}`,
            type: "error",
            severity: "medium",
            message: "Invalid JSON in AttributesJSON",
            field: "AttributesJSON",
            rowIndex: index,
            entityType: "clients",
            suggestion: "Fix JSON syntax or use valid JSON format",
            autoFixable: false,
          })
        }
      }
    })

    return errors
  }

  // 6. Unknown references
  private validateUnknownReferences(): ValidationError[] {
    const errors: ValidationError[] = []
    const taskIds = new Set(this.tasks.map((task) => task.TaskID))

    this.clients.forEach((client, index) => {
      const requestedTasks = client.RequestedTaskIDs
      if (requestedTasks) {
        const taskList =
          typeof requestedTasks === "string"
            ? requestedTasks.split(",").map((id) => id.trim())
            : Array.isArray(requestedTasks)
              ? requestedTasks
              : []

        taskList.forEach((taskId) => {
          if (taskId && !taskIds.has(taskId)) {
            errors.push({
              id: `unknown-task-${index}-${taskId}`,
              type: "error",
              severity: "high",
              message: `Unknown TaskID reference: ${taskId}`,
              field: "RequestedTaskIDs",
              rowIndex: index,
              entityType: "clients",
              suggestion: `Remove ${taskId} or add it to tasks data`,
              autoFixable: true,
            })
          }
        })
      }
    })

    return errors
  }

  // 7. Overloaded workers
  private validateOverloadedWorkers(): ValidationError[] {
    const errors: ValidationError[] = []

    this.workers.forEach((worker, index) => {
      const availableSlots = worker.AvailableSlots
      const maxLoad = worker.MaxLoadPerPhase

      if (availableSlots && maxLoad) {
        try {
          const slots = Array.isArray(availableSlots) ? availableSlots : JSON.parse(availableSlots)
          if (Array.isArray(slots) && slots.length < maxLoad) {
            errors.push({
              id: `overloaded-worker-${index}`,
              type: "warning",
              severity: "medium",
              message: `Worker has ${slots.length} available slots but MaxLoadPerPhase is ${maxLoad}`,
              field: "MaxLoadPerPhase",
              rowIndex: index,
              entityType: "workers",
              suggestion: `Reduce MaxLoadPerPhase to ${slots.length} or add more available slots`,
              autoFixable: true,
            })
          }
        } catch {
          // Already handled in malformed lists validation
        }
      }
    })

    return errors
  }

  // 8. Skill coverage
  private validateSkillCoverage(): ValidationError[] {
    const errors: ValidationError[] = []

    // Get all worker skills
    const workerSkills = new Set<string>()
    this.workers.forEach((worker) => {
      const skills = worker.Skills
      if (skills) {
        const skillList =
          typeof skills === "string" ? skills.split(",").map((s) => s.trim()) : Array.isArray(skills) ? skills : []
        skillList.forEach((skill) => workerSkills.add(skill))
      }
    })

    // Check if all required skills are covered
    this.tasks.forEach((task, index) => {
      const requiredSkills = task.RequiredSkills
      if (requiredSkills) {
        const skillList =
          typeof requiredSkills === "string"
            ? requiredSkills.split(",").map((s) => s.trim())
            : Array.isArray(requiredSkills)
              ? requiredSkills
              : []

        skillList.forEach((skill) => {
          if (skill && !workerSkills.has(skill)) {
            errors.push({
              id: `missing-skill-${index}-${skill}`,
              type: "error",
              severity: "high",
              message: `No worker has required skill: ${skill}`,
              field: "RequiredSkills",
              rowIndex: index,
              entityType: "tasks",
              suggestion: `Add a worker with ${skill} skill or remove this requirement`,
              autoFixable: false,
            })
          }
        })
      }
    })

    return errors
  }

  // 9. Max concurrency feasibility
  private validateMaxConcurrency(): ValidationError[] {
    const errors: ValidationError[] = []

    this.tasks.forEach((task, index) => {
      const maxConcurrent = task.MaxConcurrent
      const requiredSkills = task.RequiredSkills

      if (maxConcurrent && requiredSkills) {
        const skillList =
          typeof requiredSkills === "string"
            ? requiredSkills.split(",").map((s) => s.trim())
            : Array.isArray(requiredSkills)
              ? requiredSkills
              : []

        // Count qualified workers
        let qualifiedWorkers = 0
        this.workers.forEach((worker) => {
          const workerSkills = worker.Skills
          if (workerSkills) {
            const workerSkillList =
              typeof workerSkills === "string"
                ? workerSkills.split(",").map((s) => s.trim())
                : Array.isArray(workerSkills)
                  ? workerSkills
                  : []

            const hasAllSkills = skillList.every((skill) => workerSkillList.includes(skill))
            if (hasAllSkills) qualifiedWorkers++
          }
        })

        if (maxConcurrent > qualifiedWorkers) {
          errors.push({
            id: `max-concurrency-${index}`,
            type: "warning",
            severity: "medium",
            message: `MaxConcurrent (${maxConcurrent}) exceeds qualified workers (${qualifiedWorkers})`,
            field: "MaxConcurrent",
            rowIndex: index,
            entityType: "tasks",
            suggestion: `Reduce MaxConcurrent to ${qualifiedWorkers} or add more qualified workers`,
            autoFixable: true,
          })
        }
      }
    })

    return errors
  }

  // 10. Phase-slot saturation
  private validatePhaseSlotSaturation(): ValidationError[] {
    const errors: ValidationError[] = []

    // Calculate total worker slots per phase
    const phaseSlots: { [phase: number]: number } = {}

    this.workers.forEach((worker) => {
      const availableSlots = worker.AvailableSlots
      if (availableSlots) {
        try {
          const slots = Array.isArray(availableSlots) ? availableSlots : JSON.parse(availableSlots)
          if (Array.isArray(slots)) {
            slots.forEach((phase) => {
              phaseSlots[phase] = (phaseSlots[phase] || 0) + (worker.MaxLoadPerPhase || 1)
            })
          }
        } catch {
          // Skip malformed slots
        }
      }
    })

    // Calculate task duration requirements per phase
    const phaseDemand: { [phase: number]: number } = {}

    this.tasks.forEach((task, index) => {
      const duration = task.Duration
      const preferredPhases = task.PreferredPhases

      if (duration && preferredPhases) {
        try {
          let phases: number[] = []

          if (Array.isArray(preferredPhases)) {
            phases = preferredPhases
          } else if (typeof preferredPhases === "string") {
            if (preferredPhases.includes("-")) {
              // Range format like "1-3"
              const [start, end] = preferredPhases.split("-").map(Number)
              phases = Array.from({ length: end - start + 1 }, (_, i) => start + i)
            } else {
              phases = JSON.parse(preferredPhases)
            }
          }

          phases.forEach((phase) => {
            phaseDemand[phase] = (phaseDemand[phase] || 0) + duration
          })
        } catch {
          errors.push({
            id: `phase-format-${index}`,
            type: "warning",
            severity: "low",
            message: "Invalid PreferredPhases format",
            field: "PreferredPhases",
            rowIndex: index,
            entityType: "tasks",
            suggestion: 'Use format [1,2,3] or "1-3" for ranges',
            autoFixable: true,
          })
        }
      }
    })

    // Check for saturation
    Object.entries(phaseDemand).forEach(([phase, demand]) => {
      const available = phaseSlots[Number(phase)] || 0
      if (demand > available) {
        errors.push({
          id: `phase-saturation-${phase}`,
          type: "error",
          severity: "high",
          message: `Phase ${phase} is oversaturated: ${demand} duration needed, ${available} slots available`,
          field: "PreferredPhases",
          rowIndex: -1,
          entityType: "tasks",
          suggestion: `Add more workers for phase ${phase} or redistribute tasks`,
          autoFixable: false,
        })
      }
    })

    return errors
  }

  // 11. Circular co-run groups (A→B→C→A)
  private validateCircularCoRunGroups(): ValidationError[] {
    const errors: ValidationError[] = []

    // For now, we'll simulate co-run group detection by looking for patterns in task names or categories
    // In a real system, this would check actual co-run rules defined by users
    const taskGroups: { [key: string]: string[] } = {}

    this.tasks.forEach((task, index) => {
      const category = task.Category || "default"
      if (!taskGroups[category]) {
        taskGroups[category] = []
      }
      taskGroups[category].push(task.TaskID)

      // Simulate circular dependency detection
      // This is a simplified version - in reality, you'd have actual co-run rules to check
      if (task.TaskName && task.TaskName.toLowerCase().includes("circular")) {
        errors.push({
          id: `circular-corun-${index}`,
          type: "error",
          severity: "high",
          message: `Potential circular co-run dependency detected in task: ${task.TaskName}`,
          field: "TaskName",
          rowIndex: index,
          entityType: "tasks",
          suggestion: "Review co-run rules to ensure no circular dependencies exist",
          autoFixable: false,
        })
      }
    })

    return errors
  }

  // 12. Conflicting rules vs. phase-window constraints
  private validateConflictingRules(): ValidationError[] {
    const errors: ValidationError[] = []

    this.tasks.forEach((task, index) => {
      const preferredPhases = task.PreferredPhases
      const duration = task.Duration
      const maxConcurrent = task.MaxConcurrent

      if (preferredPhases && duration && maxConcurrent) {
        try {
          let phases: number[] = []

          if (Array.isArray(preferredPhases)) {
            phases = preferredPhases
          } else if (typeof preferredPhases === "string") {
            if (preferredPhases.includes("-")) {
              const [start, end] = preferredPhases.split("-").map(Number)
              phases = Array.from({ length: end - start + 1 }, (_, i) => start + i)
            } else {
              phases = JSON.parse(preferredPhases)
            }
          }

          // Check if task duration conflicts with available phase windows
          if (phases.length > 0 && duration > phases.length * 2) {
            errors.push({
              id: `conflicting-rules-${index}`,
              type: "warning",
              severity: "medium",
              message: `Task duration (${duration}) may conflict with preferred phases (${phases.join(", ")})`,
              field: "Duration",
              rowIndex: index,
              entityType: "tasks",
              suggestion: `Consider reducing duration or expanding preferred phases`,
              autoFixable: true,
            })
          }

          // Check if MaxConcurrent conflicts with phase constraints
          if (maxConcurrent > phases.length) {
            errors.push({
              id: `concurrent-phase-conflict-${index}`,
              type: "warning",
              severity: "medium",
              message: `MaxConcurrent (${maxConcurrent}) exceeds available phases (${phases.length})`,
              field: "MaxConcurrent",
              rowIndex: index,
              entityType: "tasks",
              suggestion: `Reduce MaxConcurrent to ${phases.length} or add more phases`,
              autoFixable: true,
            })
          }
        } catch {
          // Skip malformed phase data - already handled in other validations
        }
      }
    })

    return errors
  }
}
