"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle, XCircle, Info, RefreshCw, Zap, AlertCircle, TrendingUp } from "lucide-react"
import { ValidationEngine, type ValidationResult, type ValidationError } from "@/lib/validation-engine"
import { useDataStore } from "@/lib/store"

export function ValidationPanel() {
  const { clients, workers, tasks, updateRecord } = useDataStore()
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [selectedError, setSelectedError] = useState<ValidationError | null>(null)

  const runValidation = async () => {
    setIsValidating(true)

    // Simulate validation processing time
    await new Promise((resolve) => setTimeout(resolve, 500))

    const engine = new ValidationEngine(clients, workers, tasks)
    const result = engine.validateAll()
    setValidationResult(result)
    setIsValidating(false)
  }

  useEffect(() => {
    if (clients.length > 0 || workers.length > 0 || tasks.length > 0) {
      runValidation()
    }
  }, [clients, workers, tasks])

  // Add this after the existing useEffect
  useEffect(() => {
    // Real-time validation with debouncing
    const timeoutId = setTimeout(() => {
      if (clients.length > 0 || workers.length > 0 || tasks.length > 0) {
        runValidation()
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [clients, workers, tasks])

  // Enhanced validation summary with progress indicators
  const getValidationProgress = () => {
    if (!validationResult) return 0

    const totalChecks = 12 // Total number of validation rules
    const passedChecks = totalChecks - validationResult.summary.totalErrors - validationResult.summary.totalWarnings
    return Math.round((passedChecks / totalChecks) * 100)
  }

  // Add validation rule breakdown
  const getValidationBreakdown = () => {
    if (!validationResult) return []

    const ruleCategories = [
      { name: "Data Structure", rules: ["missing-column", "duplicate-id", "malformed"] },
      { name: "Data Quality", rules: ["range", "broken-json", "unknown"] },
      { name: "Business Logic", rules: ["overloaded", "skill-coverage", "max-concurrency"] },
      { name: "Advanced Rules", rules: ["circular", "conflicting", "phase-saturation"] },
    ]

    return ruleCategories.map((category) => {
      const categoryErrors = [...validationResult.errors, ...validationResult.warnings].filter((error) =>
        category.rules.some((rule) => error.id.includes(rule)),
      )

      return {
        ...category,
        errorCount: categoryErrors.length,
        status: categoryErrors.length === 0 ? "✅" : "❌",
      }
    })
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "medium":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case "low":
        return <Info className="w-4 h-4 text-blue-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-50 border-red-200 text-red-800"
      case "medium":
        return "bg-yellow-50 border-yellow-200 text-yellow-800"
      case "low":
        return "bg-blue-50 border-blue-200 text-blue-800"
      default:
        return "bg-gray-50 border-gray-200 text-gray-800"
    }
  }

  const handleAutoFix = async (error: ValidationError) => {
    // Implement auto-fix logic based on error type
    switch (error.id.split("-")[0]) {
      case "duplicate":
        // Generate new unique ID
        const newId = `${error.entityType.slice(0, 1).toUpperCase()}${Date.now()}`
        updateRecord(error.entityType, error.rowIndex, error.field, newId)
        break

      case "priority":
        // Fix priority to valid range
        updateRecord(error.entityType, error.rowIndex, error.field, 3)
        break

      case "duration":
        // Fix duration to minimum valid value
        updateRecord(error.entityType, error.rowIndex, error.field, 1)
        break

      default:
        console.log("Auto-fix not implemented for this error type")
    }

    // Re-run validation after fix
    setTimeout(runValidation, 100)
  }

  if (!validationResult && !isValidating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Data Validation
          </CardTitle>
          <CardDescription>Upload data to see validation results</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Validation Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isValidating ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : validationResult?.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Data Validation
            </CardTitle>
            <Button onClick={runValidation} disabled={isValidating} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-validate
            </Button>
          </div>
          <CardDescription>
            {isValidating ? "Running validation checks..." : "Real-time data quality analysis"}
          </CardDescription>
        </CardHeader>

        {validationResult && (
          <CardContent>
            <div className="space-y-6">
              {/* Progress Ring */}
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${getValidationProgress() * 2.51} 251`}
                      className={`transition-all duration-1000 ${
                        getValidationProgress() > 80
                          ? "text-green-500"
                          : getValidationProgress() > 60
                            ? "text-yellow-500"
                            : "text-red-500"
                      }`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{getValidationProgress()}%</div>
                      <div className="text-xs text-gray-500">Quality</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-3xl font-bold text-red-600">{validationResult.summary.totalErrors}</div>
                  <div className="text-sm text-red-600 font-medium">Critical Errors</div>
                  <div className="text-xs text-red-500 mt-1">Must be fixed</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-3xl font-bold text-yellow-600">{validationResult.summary.totalWarnings}</div>
                  <div className="text-sm text-yellow-600 font-medium">Warnings</div>
                  <div className="text-xs text-yellow-500 mt-1">Should be reviewed</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600">{validationResult.summary.criticalIssues}</div>
                  <div className="text-sm text-blue-600 font-medium">High Priority</div>
                  <div className="text-xs text-blue-500 mt-1">Immediate attention</div>
                </div>
              </div>

              {/* Validation Rule Breakdown */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Validation Categories</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getValidationBreakdown().map((category, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category.status}</span>
                        <span className="font-medium text-sm">{category.name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {category.errorCount === 0 ? "All passed" : `${category.errorCount} issues`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Alert */}
              {validationResult.isValid ? (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    🎉 Excellent! All validation checks passed. Your data is production-ready!
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-red-50 border-red-200">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <div className="space-y-1">
                      <div>
                        Found {validationResult.summary.totalErrors} errors and {validationResult.summary.totalWarnings}{" "}
                        warnings.
                      </div>
                      <div className="text-sm">
                        💡 Click on highlighted cells in the data tables to fix issues directly.
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Error List */}
      {validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Issues Found
            </CardTitle>
            <CardDescription>Click on any issue to see details and suggested fixes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {[...validationResult.errors, ...validationResult.warnings].map((error, index) => (
                <div
                  key={error.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedError?.id === error.id
                      ? "ring-2 ring-blue-500 " + getSeverityColor(error.severity)
                      : getSeverityColor(error.severity)
                  }`}
                  onClick={() => setSelectedError(selectedError?.id === error.id ? null : error)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getSeverityIcon(error.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{error.message}</span>
                          <Badge variant="outline" className="text-xs">
                            {error.entityType}
                          </Badge>
                          {error.rowIndex >= 0 && (
                            <Badge variant="outline" className="text-xs">
                              Row {error.rowIndex + 1}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm opacity-75">Field: {error.field}</div>

                        {selectedError?.id === error.id && (
                          <div className="mt-3 pt-3 border-t border-current/20">
                            {error.suggestion && (
                              <div className="mb-3">
                                <div className="text-sm font-medium mb-1">💡 Suggestion:</div>
                                <div className="text-sm opacity-90">{error.suggestion}</div>
                              </div>
                            )}

                            {error.autoFixable && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAutoFix(error)
                                }}
                                className="mr-2"
                              >
                                <Zap className="w-3 h-3 mr-1" />
                                Auto Fix
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={error.type === "error" ? "destructive" : "secondary"} className="text-xs">
                        {error.type}
                      </Badge>
                      {error.autoFixable && (
                        <Badge variant="outline" className="text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          Fixable
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Quality Score */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Data Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Overall Score */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Overall Quality</span>
                  <span className="text-sm font-bold">
                    {Math.max(
                      0,
                      100 - (validationResult.summary.totalErrors * 10 + validationResult.summary.totalWarnings * 5),
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(0, 100 - (validationResult.summary.totalErrors * 10 + validationResult.summary.totalWarnings * 5))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Quality Metrics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Data Completeness:</span>
                  <span className="ml-2 font-medium">
                    {validationResult.errors.filter((e) => e.id.includes("missing")).length === 0
                      ? "✅ Complete"
                      : "❌ Incomplete"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Reference Integrity:</span>
                  <span className="ml-2 font-medium">
                    {validationResult.errors.filter((e) => e.id.includes("unknown")).length === 0
                      ? "✅ Valid"
                      : "❌ Broken"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Format Consistency:</span>
                  <span className="ml-2 font-medium">
                    {validationResult.errors.filter((e) => e.id.includes("malformed")).length === 0
                      ? "✅ Consistent"
                      : "❌ Issues"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Business Rules:</span>
                  <span className="ml-2 font-medium">
                    {validationResult.errors.filter((e) => e.id.includes("range") || e.id.includes("overloaded"))
                      .length === 0
                      ? "✅ Valid"
                      : "❌ Violations"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
