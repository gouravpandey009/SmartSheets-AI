"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Mic, History, Sparkles, Filter, Download, X } from "lucide-react"
import { QueryParser, type ParsedQuery } from "@/lib/query-parser"
import { useDataStore } from "@/lib/store"
import { DataGrid } from "@/components/data-grid"

interface SearchResult {
  type: "clients" | "workers" | "tasks"
  data: any[]
  totalCount: number
  query: string
  confidence: number
}

export function NaturalLanguageSearch() {
  const { clients, workers, tasks } = useDataStore()
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null)

  const parser = useMemo(() => new QueryParser(), [])

  // Generate suggestions based on current data
  const suggestions = useMemo(() => {
    return parser.generateSuggestions(clients, workers, tasks)
  }, [clients, workers, tasks, parser])

  // Filter data based on parsed query
  const filterData = (data: any[], filters: any[], entityType: string) => {
    return data.filter((item) => {
      return filters.every((filter) => {
        if (filter.entityType && filter.entityType !== entityType) return true

        const fieldValue = item[filter.field]
        if (fieldValue === undefined || fieldValue === null) return false

        switch (filter.operator) {
          case "equals":
            return fieldValue === filter.value
          case "contains":
            if (Array.isArray(fieldValue)) {
              return fieldValue.some((val) => String(val).toLowerCase().includes(String(filter.value).toLowerCase()))
            }
            return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase())
          case "greater":
            return Number(fieldValue) > Number(filter.value)
          case "less":
            return Number(fieldValue) < Number(filter.value)
          case "greaterEqual":
            return Number(fieldValue) >= Number(filter.value)
          case "lessEqual":
            return Number(fieldValue) <= Number(filter.value)
          case "in":
            if (Array.isArray(fieldValue)) {
              return fieldValue.includes(filter.value)
            }
            return fieldValue === filter.value
          default:
            return true
        }
      })
    })
  }

  // Perform keyword search as fallback
  const keywordSearch = (data: any[], searchTerms: string[]) => {
    if (searchTerms.length === 0) return data

    return data.filter((item) => {
      const searchableText = Object.values(item).join(" ").toLowerCase()
      return searchTerms.some((term) => searchableText.includes(term.toLowerCase()))
    })
  }

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)

    // Simulate AI processing time
    await new Promise((resolve) => setTimeout(resolve, 800))

    const parsed = parser.parse(searchQuery)
    setParsedQuery(parsed)

    const results: SearchResult[] = []

    // Search in each entity type
    parsed.entityTypes.forEach((entityType) => {
      let data: any[] = []
      switch (entityType) {
        case "clients":
          data = clients
          break
        case "workers":
          data = workers
          break
        case "tasks":
          data = tasks
          break
      }

      // Apply filters
      let filteredData = data
      if (parsed.filters.length > 0) {
        filteredData = filterData(data, parsed.filters, entityType)
      }

      // Apply keyword search if no specific filters or as additional filter
      if (parsed.searchTerms.length > 0) {
        filteredData = keywordSearch(filteredData, parsed.searchTerms)
      }

      if (filteredData.length > 0) {
        results.push({
          type: entityType,
          data: filteredData,
          totalCount: filteredData.length,
          query: searchQuery,
          confidence: parsed.confidence,
        })
      }
    })

    setSearchResults(results)
    setIsSearching(false)

    // Add to search history
    if (!searchHistory.includes(searchQuery)) {
      setSearchHistory((prev) => [searchQuery, ...prev.slice(0, 9)]) // Keep last 10 searches
    }
  }

  const handleSearch = () => {
    performSearch(query)
    setShowSuggestions(false)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    performSearch(suggestion)
  }

  const clearResults = () => {
    setSearchResults([])
    setQuery("")
    setParsedQuery(null)
  }

  const exportResults = () => {
    const allResults = searchResults.flatMap((result) => result.data.map((item) => ({ ...item, _type: result.type })))

    const csvContent = [
      Object.keys(allResults[0] || {}).join(","),
      ...allResults.map((row) => Object.values(row).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `search-results-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Natural Language Search
          </CardTitle>
          <CardDescription>
            Search your data using plain English. Try: "Workers with React skills available in phase 2"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Ask me anything about your data..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setShowSuggestions(e.target.value.length > 2)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch()
                      if (e.key === "Escape") setShowSuggestions(false)
                    }}
                    className="pl-10 pr-4 py-3 text-base"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
                <Button variant="outline" size="icon">
                  <Mic className="w-4 h-4" />
                </Button>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2">Suggestions</div>
                    {suggestions
                      .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
                      .slice(0, 8)
                      .map((suggestion, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <History className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Recent:</span>
                {searchHistory.slice(0, 3).map((historyQuery, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSuggestionClick(historyQuery)}
                  >
                    {historyQuery}
                  </Badge>
                ))}
              </div>
            )}

            {/* Query Analysis */}
            {parsedQuery && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Query Analysis</span>
                  </div>
                  <Badge variant="outline" className="text-blue-700">
                    {parsedQuery.confidence}% confidence
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Searching in:</span>{" "}
                    {parsedQuery.entityTypes.join(", ")}
                  </div>
                  {parsedQuery.filters.length > 0 && (
                    <div>
                      <span className="text-blue-700 font-medium">Filters:</span>{" "}
                      {parsedQuery.filters.map((f, idx) => (
                        <Badge key={idx} variant="secondary" className="ml-1">
                          {f.field} {f.operator} {f.value}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {parsedQuery.searchTerms.length > 0 && (
                    <div>
                      <span className="text-blue-700 font-medium">Keywords:</span>{" "}
                      {parsedQuery.searchTerms.map((term, idx) => (
                        <Badge key={idx} variant="outline" className="ml-1">
                          {term}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Results
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportResults}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={clearResults}>
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
            <CardDescription>
              Found {searchResults.reduce((sum, result) => sum + result.totalCount, 0)} results across{" "}
              {searchResults.length} data types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {searchResults.map((result, idx) => (
                <div key={idx}>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="default" className="capitalize">
                      {result.type}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {result.totalCount} {result.totalCount === 1 ? "result" : "results"}
                    </span>
                    <Badge variant="outline" className="text-green-700">
                      {result.confidence}% match
                    </Badge>
                  </div>
                  <DataGrid data={result.data} type={result.type} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {searchResults.length === 0 && query && !isSearching && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600 mb-4">Try rephrasing your query or use one of the suggestions below:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.slice(0, 6).map((suggestion, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Example Queries */}
      {searchResults.length === 0 && !query && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Try These Example Queries
            </CardTitle>
            <CardDescription>Click on any example to see it in action</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  category: "🎯 Priority & Workload",
                  queries: [
                    "High priority clients",
                    "Overloaded workers",
                    "Clients with priority above 3",
                    "Workers with high capacity",
                  ],
                },
                {
                  category: "💻 Skills & Expertise",
                  queries: [
                    "Workers with JavaScript skills",
                    "Backend developers",
                    "Workers who know React",
                    "Frontend workers with Node.js",
                  ],
                },
                {
                  category: "⏱️ Time & Duration",
                  queries: [
                    "Tasks with duration greater than 2",
                    "Quick tasks under 1 hour",
                    "Long running projects",
                    "Tasks scheduled for phase 2",
                  ],
                },
                {
                  category: "🔄 Complex Queries",
                  queries: [
                    "Workers with React skills available in phase 2",
                    "High priority clients requesting mobile tasks",
                    "Backend workers with Python expertise",
                    "Tasks requiring JavaScript and lasting more than 3 hours",
                  ],
                },
              ].map((section, idx) => (
                <div key={idx} className="space-y-3">
                  <h4 className="font-medium text-gray-900">{section.category}</h4>
                  <div className="space-y-2">
                    {section.queries.map((exampleQuery, queryIdx) => (
                      <div
                        key={queryIdx}
                        className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSuggestionClick(exampleQuery)}
                      >
                        <div className="text-sm font-medium text-gray-900">{exampleQuery}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
