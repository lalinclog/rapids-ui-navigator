import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import type { DashboardItem } from "@/lib/types"
import type { FilterType, FilterGroup } from "@/components/types/filter"
import type { DashboardPage } from "@/components/pages-manager"

export interface DashboardState {
  // Dashboard items
  dashboardItems: DashboardItem[]
  selectedItem: string | null

  // Filters
  filters: FilterType[]
  filterGroups: FilterGroup[]
  activeFilters: string[]

  // Pages
  pages: DashboardPage[]
  currentPageId: string | null

  // UI State
  sidebarOpen: boolean
  settingsSidebarOpen: boolean
  commandMenuOpen: boolean

  // Dashboard metadata
  dashboardId: string | null
  dashboardName: string
  dashboardDescription: string
  isReadOnly: boolean

  // Actions
  setDashboardItems: (items: DashboardItem[]) => void
  addDashboardItem: (item: DashboardItem) => void
  updateDashboardItem: (id: string, updates: Partial<DashboardItem>) => void
  removeDashboardItem: (id: string) => void
  setSelectedItem: (id: string | null) => void

  // Filter actions
  addFilter: (filter: FilterType) => void
  updateFilter: (id: string, updates: Partial<FilterType>) => void
  removeFilter: (id: string) => void
  toggleFilter: (id: string) => void
  setActiveFilters: (filterIds: string[]) => void

  // Filter group actions
  addFilterGroup: (group: FilterGroup) => void
  updateFilterGroup: (id: string, updates: Partial<FilterGroup>) => void
  removeFilterGroup: (id: string) => void

  // Page actions
  setPages: (pages: DashboardPage[]) => void
  addPage: (page: DashboardPage) => void
  updatePage: (id: string, updates: Partial<DashboardPage>) => void
  removePage: (id: string) => void
  setCurrentPage: (id: string) => void

  // UI actions
  setSidebarOpen: (open: boolean) => void
  setSettingsSidebarOpen: (open: boolean) => void
  setCommandMenuOpen: (open: boolean) => void

  // Dashboard actions
  setDashboardId: (id: string) => void
  setDashboardName: (name: string) => void
  setDashboardDescription: (description: string) => void
  setReadOnly: (readOnly: boolean) => void

  // Utility actions
  reset: () => void
  exportState: () => DashboardState
  importState: (state: Partial<DashboardState>) => void
}

const initialState = {
  dashboardItems: [],
  selectedItem: null,
  filters: [],
  filterGroups: [],
  activeFilters: [],
  pages: [],
  currentPageId: null,
  sidebarOpen: true,
  settingsSidebarOpen: false,
  commandMenuOpen: false,
  dashboardId: null,
  dashboardName: "",
  dashboardDescription: "",
  isReadOnly: false,
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Dashboard item actions
        setDashboardItems: (items) => set({ dashboardItems: items }),

        addDashboardItem: (item) =>
          set((state) => ({
            dashboardItems: [...state.dashboardItems, item],
          })),

        updateDashboardItem: (id, updates) =>
          set((state) => ({
            dashboardItems: state.dashboardItems.map((item) => (item.id === id ? { ...item, ...updates } : item)),
          })),

        removeDashboardItem: (id) =>
          set((state) => ({
            dashboardItems: state.dashboardItems.filter((item) => item.id !== id),
            selectedItem: state.selectedItem === id ? null : state.selectedItem,
          })),

        setSelectedItem: (id) => set({ selectedItem: id }),

        // Filter actions
        addFilter: (filter) =>
          set((state) => ({
            filters: [...state.filters, filter],
          })),

        updateFilter: (id, updates) =>
          set((state) => ({
            filters: state.filters.map((filter) => (filter.id === id ? { ...filter, ...updates } : filter)),
          })),

        removeFilter: (id) =>
          set((state) => ({
            filters: state.filters.filter((filter) => filter.id !== id),
            activeFilters: state.activeFilters.filter((filterId) => filterId !== id),
          })),

        toggleFilter: (id) =>
          set((state) => ({
            activeFilters: state.activeFilters.includes(id)
              ? state.activeFilters.filter((filterId) => filterId !== id)
              : [...state.activeFilters, id],
          })),

        setActiveFilters: (filterIds) => set({ activeFilters: filterIds }),

        // Filter group actions
        addFilterGroup: (group) =>
          set((state) => ({
            filterGroups: [...state.filterGroups, group],
          })),

        updateFilterGroup: (id, updates) =>
          set((state) => ({
            filterGroups: state.filterGroups.map((group) => (group.id === id ? { ...group, ...updates } : group)),
          })),

        removeFilterGroup: (id) =>
          set((state) => ({
            filterGroups: state.filterGroups.filter((group) => group.id !== id),
          })),

        // Page actions
        setPages: (pages) => set({ pages }),

        addPage: (page) =>
          set((state) => ({
            pages: [...state.pages, page],
          })),

        updatePage: (id, updates) =>
          set((state) => ({
            pages: state.pages.map((page) => (page.id === id ? { ...page, ...updates } : page)),
          })),

        removePage: (id) =>
          set((state) => ({
            pages: state.pages.filter((page) => page.id !== id),
            currentPageId: state.currentPageId === id ? null : state.currentPageId,
          })),

        setCurrentPage: (id) => set({ currentPageId: id }),

        // UI actions
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setSettingsSidebarOpen: (open) => set({ settingsSidebarOpen: open }),
        setCommandMenuOpen: (open) => set({ commandMenuOpen: open }),

        // Dashboard actions
        setDashboardId: (id) => set({ dashboardId: id }),
        setDashboardName: (name) => set({ dashboardName: name }),
        setDashboardDescription: (description) => set({ dashboardDescription: description }),
        setReadOnly: (readOnly) => set({ isReadOnly: readOnly }),

        // Utility actions
        reset: () => set(initialState),

        exportState: () => get(),

        importState: (state) => set((current) => ({ ...current, ...state })),
      }),
      {
        name: "dashboard-store",
        partialize: (state) => ({
          dashboardItems: state.dashboardItems,
          filters: state.filters,
          filterGroups: state.filterGroups,
          pages: state.pages,
          dashboardName: state.dashboardName,
          dashboardDescription: state.dashboardDescription,
        }),
      },
    ),
    {
      name: "dashboard-store",
    },
  ),
)

// Selectors for common use cases
export const useDashboardItems = () => useDashboardStore((state) => state.dashboardItems)
export const useSelectedItem = () => useDashboardStore((state) => state.selectedItem)
export const useActiveFilters = () => useDashboardStore((state) => state.activeFilters)
export const useCurrentPage = () => useDashboardStore((state) => state.currentPageId)
export const useSidebarState = () =>
  useDashboardStore((state) => ({
    sidebarOpen: state.sidebarOpen,
    settingsSidebarOpen: state.settingsSidebarOpen,
  }))
