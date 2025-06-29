"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Settings, Download, Trash2, Edit, CheckCircle, Zap, FileText, Copy } from "lucide-react"
import { RuleBuilder } from "@/components/rule-builder"
import type { Rule } from "@/lib/rule-types"
import { RuleValidator } from "@/lib/rule-types"

interface RuleManagementProps {
  initialRules?: Rule[]
  onRulesChange?: (rules: Rule[]) => void
}

export function RuleManagement({ initialRules = [], onRulesChange }: RuleManagementProps = {}) {
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [showBuilder, setShowBuilder] = useState(false)
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null)

  const ruleStats = useMemo(() => {
    const enabled = rules.filter((r) => r.enabled).length
    const types = rules.reduce(
      (acc, rule) => {
        acc[rule.type] = (acc[rule.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      total: rules.length,
      enabled,
      disabled: rules.length - enabled,
      types,
    }
  }, [rules])

  const handleCreateRule = (rule: Rule) => {
    const newRules = [...rules, rule]
    setRules(newRules)
    onRulesChange?.(newRules)
    setShowBuilder(false)
  }

  const handleToggleRule = (ruleId: string) => {
    const newRules = rules.map((rule) =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled, updatedAt: new Date() } : rule,
    )
    setRules(newRules)
    onRulesChange?.(newRules)
  }

  const handleDeleteRule = (ruleId: string) => {
    const newRules = rules.filter((rule) => rule.id !== ruleId)
    setRules(newRules)
    onRulesChange?.(newRules)
  }

  const handleDuplicateRule = (rule: Rule) => {
    const duplicatedRule: Rule = {
      ...rule,
      id: `rule_${Date.now()}`,
      name: `${rule.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const newRules = [...rules, duplicatedRule]
    setRules(newRules)
    onRulesChange?.(newRules)
  }

  const generateRuleSet = () => {
    const ruleSet = RuleValidator.generateRuleSet(rules)
    const jsonString = JSON.stringify(ruleSet, null, 2)

    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rules-config-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getRuleTypeColor = (type: string) => {
    const colors = {
      coRun: "bg-blue-100 text-blue-800",
      slotRestriction: "bg-green-100 text-green-800",
      loadLimit: "bg-yellow-100 text-yellow-800",
      phaseWindow: "bg-purple-100 text-purple-800",
      patternMatch: "bg-red-100 text-red-800",
      precedence: "bg-gray-100 text-gray-800",
    }
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case "coRun":
        return "🔗"
      case "slotRestriction":
        return "🚫"
      case "loadLimit":
        return "⚖️"
      case "phaseWindow":
        return "🕐"
      case "patternMatch":
        return "🔍"
      case "precedence":
        return "📋"
      default:
        return "⚙️"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Rule Management
              </CardTitle>
              <CardDescription>Create and manage business rules for your resource allocation system</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBuilder(!showBuilder)}>
                {showBuilder ? "Hide Builder" : "New Rule"}
              </Button>
              <Button onClick={generateRuleSet} disabled={rules.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export Rules
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{ruleStats.total}</div>
              <div className="text-sm text-blue-600">Total Rules</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{ruleStats.enabled}</div>
              <div className="text-sm text-green-600">Enabled</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{ruleStats.disabled}</div>
              <div className="text-sm text-gray-600">Disabled</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{Object.keys(ruleStats.types).length}</div>
              <div className="text-sm text-purple-600">Rule Types</div>
            </div>
          </div>

          {/* Rule Type Breakdown */}
          {Object.keys(ruleStats.types).length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Rule Types</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ruleStats.types).map(([type, count]) => (
                  <Badge key={type} variant="outline" className={getRuleTypeColor(type)}>
                    {getRuleTypeIcon(type)} {type}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rule Builder */}
      {showBuilder && <RuleBuilder onRuleCreate={handleCreateRule} existingRules={rules} />}

      {/* Rules List */}
      {rules.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Active Rules</CardTitle>
            <CardDescription>
              Manage your business rules. Rules are applied in priority order (highest first).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rules
                .sort((a, b) => b.priority - a.priority)
                .map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      rule.enabled ? "bg-white" : "bg-gray-50 opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg">{getRuleTypeIcon(rule.type)}</span>
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge className={getRuleTypeColor(rule.type)}>{rule.type}</Badge>
                          <Badge variant="outline">Priority: {rule.priority}</Badge>
                          {rule.enabled ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                        </div>

                        {rule.description && <p className="text-sm text-gray-600 mb-2">{rule.description}</p>}

                        {/* Rule-specific details */}
                        <div className="text-xs text-gray-500 space-y-1">
                          {rule.type === "coRun" && (
                            <div>
                              Tasks: {rule.tasks.join(", ")} •{" "}
                              {rule.mustRunTogether ? "Must run together" : "Cannot run together"}
                            </div>
                          )}
                          {rule.type === "slotRestriction" && (
                            <div>
                              {rule.targetType} group: {rule.groupName} • Min slots: {rule.minCommonSlots}
                            </div>
                          )}
                          {rule.type === "loadLimit" && (
                            <div>
                              Worker group: {rule.workerGroup} • Max slots: {rule.maxSlotsPerPhase}
                            </div>
                          )}
                          {rule.type === "phaseWindow" && (
                            <div>
                              Task: {rule.taskId} • Phases: {rule.allowedPhases.join(", ")} •{" "}
                              {rule.strictMode ? "Strict" : "Flexible"}
                            </div>
                          )}
                          {rule.type === "patternMatch" && (
                            <div>
                              {rule.entityType}.{rule.field} matches /{rule.pattern}/ → {rule.action}
                            </div>
                          )}
                          <div>
                            Created: {rule.createdAt.toLocaleDateString()} • Updated:{" "}
                            {rule.updatedAt.toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch checked={rule.enabled} onCheckedChange={() => handleToggleRule(rule.id)} />
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicateRule(rule)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedRule(rule)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No rules created yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first business rule to get started with advanced resource allocation logic.
              </p>
              <Button onClick={() => setShowBuilder(true)}>
                <Zap className="w-4 h-4 mr-2" />
                Create First Rule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rule Preview/Export */}
      {rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generated Configuration
            </CardTitle>
            <CardDescription>Preview of the JSON configuration that will be generated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
              <pre className="text-xs text-gray-700">
                {JSON.stringify(RuleValidator.generateRuleSet(rules), null, 2)}
              </pre>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={generateRuleSet}>
                <Download className="w-4 h-4 mr-2" />
                Download rules.json
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const ruleSet = RuleValidator.generateRuleSet(rules)
                  navigator.clipboard.writeText(JSON.stringify(ruleSet, null, 2))
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
