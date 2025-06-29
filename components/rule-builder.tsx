"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, X, AlertTriangle } from "lucide-react"
import { useDataStore } from "@/lib/store"
import type {
  Rule,
  CoRunRule,
  SlotRestrictionRule,
  LoadLimitRule,
  PhaseWindowRule,
  PatternMatchRule,
} from "@/lib/rule-types"
import { RuleValidator } from "@/lib/rule-types"

interface RuleBuilderProps {
  onRuleCreate: (rule: Rule) => void
  existingRules: Rule[]
}

export function RuleBuilder({ onRuleCreate, existingRules }: RuleBuilderProps) {
  const { clients, workers, tasks } = useDataStore()
  const [ruleType, setRuleType] = useState<string>("")
  const [ruleName, setRuleName] = useState("")
  const [ruleDescription, setRuleDescription] = useState("")
  const [priority, setPriority] = useState(50)
  const [enabled, setEnabled] = useState(true)

  // Co-run rule state
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [mustRunTogether, setMustRunTogether] = useState(true)

  // Slot restriction rule state
  const [targetType, setTargetType] = useState<"client" | "worker">("worker")
  const [groupName, setGroupName] = useState("")
  const [minCommonSlots, setMinCommonSlots] = useState(1)
  const [restrictionPhases, setRestrictionPhases] = useState<number[]>([])

  // Load limit rule state
  const [workerGroup, setWorkerGroup] = useState("")
  const [maxSlotsPerPhase, setMaxSlotsPerPhase] = useState(3)
  const [loadLimitPhases, setLoadLimitPhases] = useState<number[]>([])

  // Phase window rule state
  const [selectedTaskId, setSelectedTaskId] = useState("")
  const [allowedPhases, setAllowedPhases] = useState<number[]>([])
  const [strictMode, setStrictMode] = useState(false)

  // Pattern match rule state
  const [pattern, setPattern] = useState("")
  const [field, setField] = useState("")
  const [entityType, setEntityType] = useState<"clients" | "workers" | "tasks">("tasks")
  const [action, setAction] = useState<"allow" | "deny" | "flag">("flag")

  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const resetForm = () => {
    setRuleType("")
    setRuleName("")
    setRuleDescription("")
    setPriority(50)
    setEnabled(true)
    setSelectedTasks([])
    setMustRunTogether(true)
    setTargetType("worker")
    setGroupName("")
    setMinCommonSlots(1)
    setRestrictionPhases([])
    setWorkerGroup("")
    setMaxSlotsPerPhase(3)
    setLoadLimitPhases([])
    setSelectedTaskId("")
    setAllowedPhases([])
    setStrictMode(false)
    setPattern("")
    setField("")
    setEntityType("tasks")
    setAction("flag")
    setValidationErrors([])
  }

  const buildRule = (): Rule | null => {
    const baseRule = {
      id: `rule_${Date.now()}`,
      name: ruleName,
      description: ruleDescription,
      enabled,
      priority,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    switch (ruleType) {
      case "coRun":
        return {
          ...baseRule,
          type: "coRun",
          tasks: selectedTasks,
          mustRunTogether,
        } as CoRunRule

      case "slotRestriction":
        return {
          ...baseRule,
          type: "slotRestriction",
          targetType,
          groupName,
          minCommonSlots,
          phases: restrictionPhases.length > 0 ? restrictionPhases : undefined,
        } as SlotRestrictionRule

      case "loadLimit":
        return {
          ...baseRule,
          type: "loadLimit",
          workerGroup,
          maxSlotsPerPhase,
          phases: loadLimitPhases.length > 0 ? loadLimitPhases : undefined,
        } as LoadLimitRule

      case "phaseWindow":
        return {
          ...baseRule,
          type: "phaseWindow",
          taskId: selectedTaskId,
          allowedPhases,
          strictMode,
        } as PhaseWindowRule

      case "patternMatch":
        return {
          ...baseRule,
          type: "patternMatch",
          pattern,
          field,
          entityType,
          action,
        } as PatternMatchRule

      default:
        return null
    }
  }

  const handleCreateRule = () => {
    const rule = buildRule()
    if (!rule) return

    const validation = RuleValidator.validateRule(rule, existingRules)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    onRuleCreate(rule)
    resetForm()
    setValidationErrors([])
  }

  const addTask = (taskId: string) => {
    if (!selectedTasks.includes(taskId)) {
      setSelectedTasks([...selectedTasks, taskId])
    }
  }

  const removeTask = (taskId: string) => {
    setSelectedTasks(selectedTasks.filter((id) => id !== taskId))
  }

  const addPhase = (phases: number[], setPhases: (phases: number[]) => void, phase: number) => {
    if (!phases.includes(phase)) {
      setPhases([...phases, phase].sort())
    }
  }

  const removePhase = (phases: number[], setPhases: (phases: number[]) => void, phase: number) => {
    setPhases(phases.filter((p) => p !== phase))
  }

  const getUniqueGroups = (type: "client" | "worker") => {
    const data = type === "client" ? clients : workers
    const groupField = type === "client" ? "GroupTag" : "WorkerGroup"

    // Fix the Set iteration and type issues
    const groups = data
      .map((item: any) => item[groupField])
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index) // Remove duplicates manually

    return groups
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Rule</CardTitle>
        <CardDescription>Build business rules using our visual interface</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Basic Rule Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rule-type">Rule Type</Label>
              <Select value={ruleType} onValueChange={setRuleType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rule type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coRun">Co-run Tasks</SelectItem>
                  <SelectItem value="slotRestriction">Slot Restriction</SelectItem>
                  <SelectItem value="loadLimit">Load Limit</SelectItem>
                  <SelectItem value="phaseWindow">Phase Window</SelectItem>
                  <SelectItem value="patternMatch">Pattern Match</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                placeholder="Enter rule name"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority (1-100)</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="100"
                value={priority}
                onChange={(e) => setPriority(Number.parseInt(e.target.value))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
              <Label htmlFor="enabled">Rule Enabled</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe what this rule does"
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
            />
          </div>

          {/* Rule-specific Configuration */}
          {ruleType === "coRun" && (
            <div className="space-y-4">
              <h4 className="font-medium">Co-run Configuration</h4>
              <div className="space-y-2">
                <Label>Select Tasks</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {tasks.map((task) => (
                    <div
                      key={task.TaskID}
                      className={`p-2 border rounded cursor-pointer text-sm ${
                        selectedTasks.includes(task.TaskID) ? "bg-blue-100 border-blue-300" : "hover:bg-gray-100"
                      }`}
                      onClick={() =>
                        selectedTasks.includes(task.TaskID) ? removeTask(task.TaskID) : addTask(task.TaskID)
                      }
                    >
                      {task.TaskID}: {task.TaskName}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedTasks.map((taskId) => (
                    <Badge key={taskId} variant="secondary">
                      {taskId}
                      <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeTask(taskId)} />
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={mustRunTogether} onCheckedChange={setMustRunTogether} />
                <Label>Must run together (vs. cannot run together)</Label>
              </div>
            </div>
          )}

          {ruleType === "slotRestriction" && (
            <div className="space-y-4">
              <h4 className="font-medium">Slot Restriction Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Type</Label>
                  <Select value={targetType} onValueChange={(value: "client" | "worker") => setTargetType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client Group</SelectItem>
                      <SelectItem value="worker">Worker Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Select value={groupName} onValueChange={setGroupName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUniqueGroups(targetType).map((group) => (
                        <SelectItem key={group} value={group}>
                          {group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Minimum Common Slots</Label>
                  <Input
                    type="number"
                    min="1"
                    value={minCommonSlots}
                    onChange={(e) => setMinCommonSlots(Number.parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {ruleType === "loadLimit" && (
            <div className="space-y-4">
              <h4 className="font-medium">Load Limit Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Worker Group</Label>
                  <Select value={workerGroup} onValueChange={setWorkerGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select worker group" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUniqueGroups("worker").map((group) => (
                        <SelectItem key={group} value={group}>
                          {group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Slots Per Phase</Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxSlotsPerPhase}
                    onChange={(e) => setMaxSlotsPerPhase(Number.parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {ruleType === "phaseWindow" && (
            <div className="space-y-4">
              <h4 className="font-medium">Phase Window Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Task</Label>
                  <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select task" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.map((task) => (
                        <SelectItem key={task.TaskID} value={task.TaskID}>
                          {task.TaskID}: {task.TaskName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch checked={strictMode} onCheckedChange={setStrictMode} />
                  <Label>Strict Mode</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Allowed Phases</Label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map((phase) => (
                    <Button
                      key={phase}
                      variant={allowedPhases.includes(phase) ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        allowedPhases.includes(phase)
                          ? removePhase(allowedPhases, setAllowedPhases, phase)
                          : addPhase(allowedPhases, setAllowedPhases, phase)
                      }
                    >
                      Phase {phase}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {ruleType === "patternMatch" && (
            <div className="space-y-4">
              <h4 className="font-medium">Pattern Match Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select
                    value={entityType}
                    onValueChange={(value: "clients" | "workers" | "tasks") => setEntityType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clients">Clients</SelectItem>
                      <SelectItem value="workers">Workers</SelectItem>
                      <SelectItem value="tasks">Tasks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Field</Label>
                  <Input
                    placeholder="e.g., TaskName, Skills, Category"
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pattern (Regex)</Label>
                  <Input
                    placeholder="e.g., ^(Mobile|Web).*"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={action} onValueChange={(value: "allow" | "deny" | "flag") => setAction(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow">Allow</SelectItem>
                      <SelectItem value="deny">Deny</SelectItem>
                      <SelectItem value="flag">Flag for Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="space-y-2">
              {validationErrors.map((error, idx) => (
                <div key={idx} className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleCreateRule} disabled={!ruleType || !ruleName}>
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
