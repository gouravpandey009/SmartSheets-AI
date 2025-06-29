"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileSpreadsheet, Users, Briefcase, CheckCircle, Shield, Search, Settings, Brain } from "lucide-react"
import { FileUploader } from "@/components/file-uploader"
import { DataGrid } from "@/components/data-grid"
import { ValidationPanel } from "@/components/validation-panel"
import { NaturalLanguageSearch } from "@/components/natural-language-search"
import { RuleManagement } from "@/components/rule-management"
import { AIAssistant } from "@/components/ai-assistant"
import { useDataStore } from "@/lib/store"
import type { Rule } from "@/lib/rule-types"

export default function HomePage() {
  const { clients, workers, tasks, hasData } = useDataStore()
  const [activeTab, setActiveTab] = useState<
    "upload" | "clients" | "workers" | "tasks" | "validation" | "search" | "rules" | "ai"
  >("upload")
  const [rules, setRules] = useState<Rule[]>([])

  const handleRuleCreate = (rule: Rule) => {
    setRules((prev) => [...prev, rule])
  }

  const handleDataCorrection = (correction: any) => {
    console.log("Applying data correction:", correction)
    // Implement data correction logic here
    alert(`Data correction applied: ${correction.type}`)
  }

  const getDataCount = (tab: string) => {
    switch (tab) {
      case "clients":
        return clients.length
      case "workers":
        return workers.length
      case "tasks":
        return tasks.length
      default:
        return 0
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Data Alchemist ⚗️</h1>
          <p className="text-lg text-gray-600">AI-Powered Resource Allocation Configurator</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {[
            { id: "upload", label: "Upload Files", icon: Upload },
            { id: "ai", label: "AI Assistant", icon: Brain },
            { id: "search", label: "AI Search", icon: Search },
            { id: "validation", label: "Validation", icon: Shield },
            { id: "rules", label: "Rules", icon: Settings },
            { id: "clients", label: "Clients", icon: Users },
            { id: "workers", label: "Workers", icon: Users },
            { id: "tasks", label: "Tasks", icon: Briefcase },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-2"
              disabled={tab.id !== "upload" && tab.id !== "rules" && tab.id !== "ai" && !hasData()}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id !== "upload" &&
                tab.id !== "validation" &&
                tab.id !== "search" &&
                tab.id !== "rules" &&
                tab.id !== "ai" &&
                hasData() && (
                  <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                    {getDataCount(tab.id)}
                  </span>
                )}
              {tab.id !== "upload" &&
                tab.id !== "validation" &&
                tab.id !== "search" &&
                tab.id !== "rules" &&
                tab.id !== "ai" &&
                getDataCount(tab.id) > 0 && <CheckCircle className="w-3 h-3 text-green-600" />}
            </Button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === "upload" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Upload Your Data Files
                </CardTitle>
                <CardDescription>
                  Upload CSV or XLSX files for clients, workers, and tasks. Our AI will help parse and validate your
                  data automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploader />
              </CardContent>
            </Card>
          )}

          {activeTab === "ai" && (
            <AIAssistant rules={rules} onRuleCreate={handleRuleCreate} onDataCorrection={handleDataCorrection} />
          )}

          {activeTab === "search" && hasData() && <NaturalLanguageSearch />}

          {activeTab === "validation" && hasData() && <ValidationPanel />}

          {activeTab === "rules" && <RuleManagement initialRules={rules} onRulesChange={setRules} />}

          {activeTab === "clients" && clients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Clients Data ({clients.length} records)
                </CardTitle>
                <CardDescription>View and edit client information. Click on any cell to make changes.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataGrid data={clients} type="clients" />
              </CardContent>
            </Card>
          )}

          {activeTab === "workers" && workers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Workers Data ({workers.length} records)
                </CardTitle>
                <CardDescription>View and edit worker information. Click on any cell to make changes.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataGrid data={workers} type="workers" />
              </CardContent>
            </Card>
          )}

          {activeTab === "tasks" && tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Tasks Data ({tasks.length} records)
                </CardTitle>
                <CardDescription>View and edit task information. Click on any cell to make changes.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataGrid data={tasks} type="tasks" />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Progress Indicator */}
        {hasData() && (
          <Card className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-4 text-green-800">
                <Brain className="w-6 h-6 text-purple-600" />
                <span className="font-medium">
                  🧠 AI Assistant is ready! Use natural language to create rules, get smart recommendations, and
                  optimize your resource allocation.
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
