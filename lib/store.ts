import { create } from "zustand"

interface Client {
  ClientID: string
  ClientName: string
  PriorityLevel: number
  RequestedTaskIDs: string | string[]
  GroupTag: string
  AttributesJSON: any
}

interface Worker {
  WorkerID: string
  WorkerName: string
  Skills: string | string[]
  AvailableSlots: number[]
  MaxLoadPerPhase: number
  WorkerGroup: string
  QualificationLevel: number
}

interface Task {
  TaskID: string
  TaskName: string
  Category: string
  Duration: number
  RequiredSkills: string | string[]
  PreferredPhases: string | number[]
  MaxConcurrent: number
}

interface DataStore {
  clients: Client[]
  workers: Worker[]
  tasks: Task[]
  setClients: (clients: Client[]) => void
  setWorkers: (workers: Worker[]) => void
  setTasks: (tasks: Task[]) => void
  updateRecord: (type: "clients" | "workers" | "tasks", index: number, field: string, value: any) => void
  hasData: () => boolean
}

export const useDataStore = create<DataStore>((set, get) => ({
  clients: [],
  workers: [],
  tasks: [],

  setClients: (clients) => set({ clients }),
  setWorkers: (workers) => set({ workers }),
  setTasks: (tasks) => set({ tasks }),

  updateRecord: (type, index, field, value) => {
    const state = get()

    if (type === "clients") {
      const updated = [...state.clients]
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value }
        set({ clients: updated })
      }
    } else if (type === "workers") {
      const updated = [...state.workers]
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value }
        set({ workers: updated })
      }
    } else if (type === "tasks") {
      const updated = [...state.tasks]
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value }
        set({ tasks: updated })
      }
    }
  },

  hasData: () => {
    const state = get()
    return state.clients.length > 0 || state.workers.length > 0 || state.tasks.length > 0
  },
}))
