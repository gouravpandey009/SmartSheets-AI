import Papa from "papaparse"
import * as XLSX from "xlsx"

export async function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Clean and normalize headers
        return header.trim().replace(/\s+/g, "")
      },
      transform: (value, field) => {
        // Handle different data types
        if (value === "" || value === null || value === undefined) {
          return null
        }

        // Convert to string first for string operations
        const stringValue = String(value)

        // Try to parse JSON for AttributesJSON fields
        if (field && String(field).toLowerCase().includes("json")) {
          try {
            return JSON.parse(stringValue)
          } catch {
            return stringValue
          }
        }

        // Try to parse arrays for fields like AvailableSlots, PreferredPhases
        if (
          field &&
          (String(field).toLowerCase().includes("slots") ||
            String(field).toLowerCase().includes("phases") ||
            String(field).toLowerCase().includes("ids"))
        ) {
          try {
            // Handle array notation [1,2,3] or comma-separated values
            if (stringValue.startsWith("[") && stringValue.endsWith("]")) {
              return JSON.parse(stringValue)
            } else if (stringValue.includes(",")) {
              return stringValue.split(",").map((v) => {
                const trimmed = v.trim()
                return isNaN(Number(trimmed)) ? trimmed : Number(trimmed)
              })
            }
          } catch {
            return stringValue
          }
        }

        // Try to parse numbers
        if (!isNaN(Number(stringValue)) && stringValue.trim() !== "") {
          return Number(stringValue)
        }

        return stringValue
      },
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing error: ${results.errors[0].message}`))
        } else {
          resolve(results.data as any[])
        }
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`))
      },
    })
  })
}

export async function parseXLSX(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        // Get the first worksheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: null,
        }) as any[][]

        if (jsonData.length === 0) {
          resolve([])
          return
        }

        // Get headers from first row
        const headers = jsonData[0].map((header: any) =>
          String(header || "")
            .trim()
            .replace(/\s+/g, ""),
        )

        // Convert rows to objects
        const result = jsonData
          .slice(1)
          .map((row) => {
            const obj: any = {}
            headers.forEach((header, index) => {
              const value = row[index]

              if (value === null || value === undefined || value === "") {
                obj[header] = null
                return
              }

              const stringValue = String(value)

              // Handle JSON fields
              if (String(header).toLowerCase().includes("json")) {
                try {
                  obj[header] = typeof value === "string" ? JSON.parse(stringValue) : value
                } catch {
                  obj[header] = value
                }
                return
              }

              // Handle array fields
              if (
                String(header).toLowerCase().includes("slots") ||
                String(header).toLowerCase().includes("phases") ||
                String(header).toLowerCase().includes("ids")
              ) {
                try {
                  if (typeof value === "string") {
                    if (stringValue.startsWith("[") && stringValue.endsWith("]")) {
                      obj[header] = JSON.parse(stringValue)
                    } else if (stringValue.includes(",")) {
                      obj[header] = stringValue.split(",").map((v) => {
                        const trimmed = v.trim()
                        return isNaN(Number(trimmed)) ? trimmed : Number(trimmed)
                      })
                    } else {
                      obj[header] = value
                    }
                  } else {
                    obj[header] = value
                  }
                } catch {
                  obj[header] = value
                }
                return
              }

              obj[header] = value
            })
            return obj
          })
          .filter((row) => Object.values(row).some((val) => val !== null && val !== ""))

        resolve(result)
      } catch (error) {
        reject(new Error(`Failed to parse XLSX: ${error instanceof Error ? error.message : "Unknown error"}`))
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsArrayBuffer(file)
  })
}
