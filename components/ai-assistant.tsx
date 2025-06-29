"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Brain,
  Sparkles,
  MessageSquare,
  Lightbulb,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Wand2,
  RefreshCw,
} from "lucide-react"
import { useDataStore } from "@/lib/store"
import { AIEngine, type AIRecommendation } from "@/lib/ai-engine"
import type { Rule } from "@/lib/rule-types"

interface AIAssistantProps {
  rules: Rule[]
  onRuleCreate: (rule: Rule) => void
  onDataCorrection: (correction: any) => void
}

export function AIAssistant({ rules, onRuleCreate, onDataCorrection }: AIAssistantProps) {
  const { clients, workers, tasks } = useDataStore()
  const [aiEngine, setAiEngine] = useState<AIEngine | null>(null)
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("")
  const [isProcessingRule, setIsProcessingRule] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "recommendations" | "insights">("chat")

  // Initialize AI Engine
  useEffect(() => {
    if (clients.length > 0 || workers.length > 0 || tasks.length > 0) {
      const engine = new AIEngine(clients, workers, tasks, rules)
      setAiEngine(engine)
      loadRecommendations(engine)
    }
  }, [clients, workers, tasks, rules])

  const loadRecommendations = async (engine: AIEngine) => {
    setIsLoading(true)
    try {
      const [ruleRecs, dataRecs, insights] = await Promise.all([
        engine.generateRuleRecommendations(),
        engine.generateDataCorrections(),
        engine.generateInsights(),
      ])

      setRecommendations([...ruleRecs, ...dataRecs, ...insights])
    } catch (error) {
      console.error("Failed to load AI recommendations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNaturalLanguageRule = async () => {
    if (!aiEngine || !naturalLanguageInput.trim()) return

    setIsProcessingRule(true)
    try {
      const result = await aiEngine.parseNaturalLanguageRule(naturalLanguageInput)

      if (result.success && result.rule) {
        const rule: Rule = {
          id: `ai_rule_${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...result.rule,
        } as Rule

        onRuleCreate(rule)
        setNaturalLanguageInput("")

        // Show success message
        alert(`✅ Rule created successfully!\nConfidence: ${result.confidence}%\nExplanation: ${result.explanation}`)
      } else {
        alert(`❌ Failed to create rule: ${result.explanation}`)
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsProcessingRule(false)
    }
  }

  const handleApplyRecommendation = async (recommendation: AIRecommendation) => {
    if (recommendation.autoApplicable) {
      switch (recommendation.suggestedAction?.type) {
        case "standardize":
          onDataCorrection({
            type: "standardize",
            field: recommendation.suggestedAction.field,
            entityType: recommendation.suggestedAction.entityType,
            examples: recommendation.suggestedAction.examples,
          })
          break

        case "loadLimit":
          const loadLimitRule: Rule = {
            id: `ai_rule_${Date.now()}`,
            name: `Auto: ${recommendation.title}`,
            description: recommendation.description,
            type: "loadLimit",
            enabled: true,
            priority: 60,
            createdAt: new Date(),
            updatedAt: new Date(),
            workerGroup: recommendation.suggestedAction.workerId || "Backend",
            maxSlotsPerPhase: recommendation.suggestedAction.suggestedMaxLoad || 3,
          } as Rule
          onRuleCreate(loadLimitRule)
          break
      }

      // Remove applied recommendation
      setRecommendations((prev) => prev.filter((r) => r.id !== recommendation.id))
    }
  }

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "rule":
        return <Zap className="w-4 h-4" />
      case "data_correction":
        return <AlertTriangle className="w-4 h-4" />
      case "optimization":
        return <TrendingUp className="w-4 h-4" />
      case "insight":
        return <Lightbulb className="w-4 h-4" />
      default:
        return <Brain className="w-4 h-4" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredRecommendations = recommendations.filter((rec) => {
    switch (activeTab) {
      case "recommendations":
        return rec.type === "rule" || rec.type === "data_correction"
      case "insights":
        return rec.type === "optimization" || rec.type === "insight"
      default:
        return true
    }
  })

  if (!aiEngine) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">AI Assistant Ready</h3>
            <p className="text-gray-600">Upload data to activate AI-powered recommendations and insights</p>
            <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
              <strong>🤖 Real AI Powered:</strong> Using OpenAI GPT-4 for intelligent analysis
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI Assistant Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Assistant
            <Badge variant="default" className="bg-green-100 text-green-800">
              🤖 AI Powered
            </Badge>
          </CardTitle>
          <CardDescription>
            Get intelligent recommendations, create rules with natural language, and optimize your resource allocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {[
              { id: "chat", label: "Natural Language", icon: MessageSquare },
              { id: "recommendations", label: "Recommendations", icon: Lightbulb },
              { id: "insights", label: "Insights", icon: TrendingUp },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center gap-2"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id !== "chat" && (
                  <Badge variant="secondary" className="ml-1">
                    {filteredRecommendations.length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{recommendations.length}</div>
              <div className="text-sm text-purple-600">Total Suggestions</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {recommendations.filter((r) => r.autoApplicable).length}
              </div>
              <div className="text-sm text-green-600">Auto-Fixable</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {recommendations.filter((r) => r.impact === "high").length}
              </div>
              <div className="text-sm text-red-600">High Impact</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length || 0)}%
              </div>
              <div className="text-sm text-blue-600">Avg Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Natural Language Rule Creation */}
      {activeTab === "chat" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Create Rules with Natural Language
            </CardTitle>
            <CardDescription>Describe your business rule in plain English and I'll create it for you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Example: 'Prevent mobile development tasks from running with backend tasks' or 'Limit senior developers to maximum 3 tasks per phase'"
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                rows={3}
              />

              <Button
                onClick={handleNaturalLanguageRule}
                disabled={isProcessingRule || !naturalLanguageInput.trim()}
                className="w-full"
              >
                {isProcessingRule ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Rule with AI
                  </>
                )}
              </Button>

              {/* Example Prompts */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Try these examples:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    "Prevent tasks T001 and T002 from running together",
                    "Limit frontend workers to 2 tasks per phase",
                    "Only allow task T003 to run in phases 1 and 2",
                    "Workers in 'Senior' group should have max 3 slots per phase",
                    "Flag any task with 'Mobile' in the name for review",
                    "Tasks requiring JavaScript must run in phase 2 or 3",
                  ].map((example, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 text-sm"
                      onClick={() => setNaturalLanguageInput(example)}
                    >
                      "{example}"
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations & Insights */}
      {(activeTab === "recommendations" || activeTab === "insights") && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {activeTab === "recommendations" ? (
                  <>
                    <Lightbulb className="w-5 h-5" />
                    AI Recommendations
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    AI Insights
                  </>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => aiEngine && loadRecommendations(aiEngine)}
                disabled={isLoading}
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
            <CardDescription>
              {activeTab === "recommendations"
                ? "Smart suggestions to improve your data quality and create optimal rules"
                : "Deep insights about resource utilization, bottlenecks, and optimization opportunities"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
                <p className="text-gray-600">AI is analyzing your data...</p>
              </div>
            ) : filteredRecommendations.length > 0 ? (
              <div className="space-y-4">
                {filteredRecommendations
                  .sort((a, b) => b.confidence - a.confidence)
                  .map((recommendation) => (
                    <div key={recommendation.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getRecommendationIcon(recommendation.type)}
                            <h4 className="font-medium">{recommendation.title}</h4>
                            <Badge className={getImpactColor(recommendation.impact)}>
                              {recommendation.impact} impact
                            </Badge>
                            <Badge variant="outline">{recommendation.confidence}% confidence</Badge>
                            {recommendation.autoApplicable && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <Zap className="w-3 h-3 mr-1" />
                                Auto-fix
                              </Badge>
                            )}
                          </div>

                          <p className="text-gray-700 mb-2">{recommendation.description}</p>

                          <div className="text-sm text-gray-500 mb-3">
                            <strong>Category:</strong> {recommendation.category} • <strong>Reasoning:</strong>{" "}
                            {recommendation.reasoning}
                          </div>

                          {recommendation.suggestedAction && (
                            <div className="text-xs bg-blue-50 p-2 rounded">
                              <strong>Suggested Action:</strong>{" "}
                              {JSON.stringify(recommendation.suggestedAction, null, 2)}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 ml-4">
                          {recommendation.autoApplicable && (
                            <Button size="sm" onClick={() => handleApplyRecommendation(recommendation)}>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Apply
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRecommendations((prev) => prev.filter((r) => r.id !== recommendation.id))}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">No {activeTab} available</h3>
                <p className="text-gray-600">
                  {activeTab === "recommendations"
                    ? "Your data looks good! I'll notify you if I find any optimization opportunities."
                    : "I'm still analyzing your data patterns. Check back soon for insights."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
