"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react"
import { parseCSV, parseXLSX } from "@/lib/file-parser"
import { useDataStore } from "@/lib/store"

interface UploadedFile {
  file: File
  type: "clients" | "workers" | "tasks" | "unknown"
  status: "pending" | "processing" | "success" | "error"
  error?: string
  recordCount?: number
}

export function FileUploader() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const { setClients, setWorkers, setTasks } = useDataStore()

  const detectFileType = (filename: string): "clients" | "workers" | "tasks" | "unknown" => {
    const name = filename.toLowerCase()
    if (name.includes("client")) return "clients"
    if (name.includes("worker")) return "workers"
    if (name.includes("task")) return "tasks"
    return "unknown"
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      file,
      type: detectFileType(file.name),
      status: "pending",
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: true,
  })

  const processFiles = async () => {
    setIsProcessing(true)

    for (let i = 0; i < uploadedFiles.length; i++) {
      const uploadedFile = uploadedFiles[i]

      if (uploadedFile.status !== "pending") continue

      // Update status to processing
      setUploadedFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "processing" } : f)))

      try {
        let data: any[] = []

        if (uploadedFile.file.name.endsWith(".csv")) {
          data = await parseCSV(uploadedFile.file)
        } else if (uploadedFile.file.name.endsWith(".xlsx") || uploadedFile.file.name.endsWith(".xls")) {
          data = await parseXLSX(uploadedFile.file)
        }

        // Store data based on type
        switch (uploadedFile.type) {
          case "clients":
            setClients(data)
            break
          case "workers":
            setWorkers(data)
            break
          case "tasks":
            setTasks(data)
            break
        }

        // Update status to success
        setUploadedFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "success", recordCount: data.length } : f)),
        )
      } catch (error) {
        // Update status to error
        setUploadedFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error",
                  error: error instanceof Error ? error.message : "Failed to process file",
                }
              : f,
          ),
        )
      }
    }

    setIsProcessing(false)
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case "processing":
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      default:
        return <FileSpreadsheet className="w-4 h-4 text-gray-400" />
    }
  }

  const getTypeColor = (type: UploadedFile["type"]) => {
    switch (type) {
      case "clients":
        return "bg-blue-100 text-blue-800"
      case "workers":
        return "bg-green-100 text-green-800"
      case "tasks":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-blue-600 font-medium">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-gray-600 font-medium mb-2">Drag & drop your CSV or XLSX files here</p>
                <p className="text-sm text-gray-500 mb-4">or click to select files</p>
                <Button variant="outline">Choose Files</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Uploaded Files</h3>
                {uploadedFiles.some((f) => f.status === "pending") && (
                  <Button onClick={processFiles} disabled={isProcessing} size="sm">
                    {isProcessing ? "Processing..." : "Process Files"}
                  </Button>
                )}
              </div>

              {uploadedFiles.map((uploadedFile, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {getStatusIcon(uploadedFile.status)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{uploadedFile.file.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(uploadedFile.type)}`}
                      >
                        {uploadedFile.type}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500">
                      {(uploadedFile.file.size / 1024).toFixed(1)} KB
                      {uploadedFile.recordCount && <span className="ml-2">• {uploadedFile.recordCount} records</span>}
                    </div>

                    {uploadedFile.status === "processing" && <Progress value={50} className="mt-2 h-1" />}

                    {uploadedFile.error && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{uploadedFile.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertDescription>
          <strong>File naming tips:</strong> Name your files with keywords like "clients", "workers", or "tasks" for
          automatic detection. Supported formats: CSV, XLSX, XLS.
        </AlertDescription>
      </Alert>
    </div>
  )
}
