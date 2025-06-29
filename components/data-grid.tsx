"use client"

import { useState, useMemo, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Edit2, Save, X, AlertTriangle } from "lucide-react"
import { useDataStore } from "@/lib/store"
import { ValidationEngine, type ValidationError } from "@/lib/validation-engine"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DataGridProps {
  data: any[]
  type: "clients" | "workers" | "tasks"
}

export function DataGrid({ data, type }: DataGridProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
  const [editValue, setEditValue] = useState("")
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const { updateRecord, clients, workers, tasks } = useDataStore()

  // Run validation when data changes
  useEffect(() => {
    const engine = new ValidationEngine(clients, workers, tasks)
    const result = engine.validateAll()
    setValidationErrors([...result.errors, ...result.warnings])
  }, [clients, workers, tasks, data])

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data

    return data.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [data, searchTerm])

  // Get column headers
  const columns = useMemo(() => {
    if (data.length === 0) return []
    return Object.keys(data[0])
  }, [data])

  const startEdit = (rowIndex: number, column: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, col: column })
    setEditValue(String(currentValue || ""))
  }

  const saveEdit = () => {
    if (!editingCell) return

    const actualRowIndex = data.findIndex((row) => row === filteredData[editingCell.row])
    if (actualRowIndex !== -1) {
      updateRecord(type, actualRowIndex, editingCell.col, editValue)
    }

    setEditingCell(null)
    setEditValue("")
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue("")
  }

  // Check if a cell has validation errors
  const getCellErrors = (rowIndex: number, column: string) => {
    const actualRowIndex = data.findIndex((row) => row === filteredData[rowIndex])
    return validationErrors.filter(
      (error) => error.entityType === type && error.rowIndex === actualRowIndex && error.field === column,
    )
  }

  // Enhanced cell styling with better visual feedback
  const getCellStyling = (rowIndex: number, column: string) => {
    const errors = getCellErrors(rowIndex, column)
    if (errors.length === 0) return "hover:bg-gray-100 transition-colors"

    const hasError = errors.some((e) => e.type === "error")
    const hasWarning = errors.some((e) => e.type === "warning")

    if (hasError) return "bg-red-50 border-2 border-red-300 hover:bg-red-100 transition-colors animate-pulse"
    if (hasWarning) return "bg-yellow-50 border-2 border-yellow-300 hover:bg-yellow-100 transition-colors"
    return "hover:bg-gray-100 transition-colors"
  }

  // Enhanced error tooltip content
  const getErrorTooltipContent = (errors: ValidationError[]) => {
    if (errors.length === 0) return null

    return (
      <div className="space-y-2 max-w-xs">
        {errors.map((error, idx) => (
          <div key={idx} className="text-xs">
            <div className="flex items-center gap-1 font-medium">
              {error.type === "error" ? "❌" : "⚠️"} {error.type.toUpperCase()}
            </div>
            <div className="text-gray-200 mt-1">{error.message}</div>
            {error.suggestion && <div className="text-blue-200 mt-1 italic">💡 {error.suggestion}</div>}
          </div>
        ))}
      </div>
    )
  }

  const formatCellValue = (value: any, column: string) => {
    if (value === null || value === undefined) return ""

    // Handle arrays
    if (Array.isArray(value)) {
      return value.join(", ")
    }

    // Handle JSON objects
    if (typeof value === "object") {
      return JSON.stringify(value)
    }

    // Handle comma-separated values as badges for certain columns
    if (
      typeof value === "string" &&
      (column.toLowerCase().includes("skill") ||
        column.toLowerCase().includes("tag") ||
        column.toLowerCase().includes("id"))
    ) {
      const items = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
      if (items.length > 1) {
        return (
          <div className="flex flex-wrap gap-1">
            {items.map((item, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        )
      }
    }

    return String(value)
  }

  const getColumnWidth = (column: string) => {
    switch (column.toLowerCase()) {
      case "clientid":
      case "workerid":
      case "taskid":
        return "w-24"
      case "prioritylevel":
      case "duration":
      case "maxconcurrent":
      case "maxloadperphase":
        return "w-20"
      case "attributesjson":
        return "w-48"
      default:
        return "w-32"
    }
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available. Please upload a file first.</div>
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-500">
          Showing {filteredData.length} of {data.length} records
        </div>
        {validationErrors.filter((e) => e.entityType === type).length > 0 && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" />
            {validationErrors.filter((e) => e.entityType === type && e.type === "error").length} errors,{" "}
            {validationErrors.filter((e) => e.entityType === type && e.type === "warning").length} warnings
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className={`font-medium ${getColumnWidth(column)}`}>
                    {column}
                  </TableHead>
                ))}
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-gray-50">
                  {columns.map((column) => {
                    const cellErrors = getCellErrors(rowIndex, column)
                    return (
                      <TableCell key={column} className={`${getColumnWidth(column)} max-w-0 relative`}>
                        {editingCell?.row === rowIndex && editingCell?.col === column ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit()
                                if (e.key === "Escape") cancelEdit()
                              }}
                              onBlur={() => {
                                // Auto-save on blur for better UX
                                saveEdit()
                              }}
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" onClick={saveEdit} className="h-8 w-8 p-0">
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 w-8 p-0">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`truncate cursor-pointer p-2 rounded text-xs relative ${getCellStyling(rowIndex, column)}`}
                                  onClick={() => startEdit(rowIndex, column, row[column])}
                                  title={String(row[column] || "")}
                                >
                                  {formatCellValue(row[column], column)}
                                  {getCellErrors(rowIndex, column).length > 0 && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">!</span>
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-gray-800 text-white border-gray-600">
                                {getErrorTooltipContent(getCellErrors(rowIndex, column)) || (
                                  <div className="text-xs">
                                    <div className="font-medium">{column}</div>
                                    <div className="text-gray-300">{String(row[column] || "Empty")}</div>
                                    <div className="text-blue-300 mt-1">Click to edit</div>
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(rowIndex, columns[0], row[columns[0]])}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
