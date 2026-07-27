import { useMemo } from 'react'
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useIsFetching,
} from '@tanstack/react-query'
import { api } from '../lib/api'
import { useUIStore } from '../stores/ui'
import { useDebouncedValue } from './useDebouncedValue'
import type { EmailSummary } from '@maildev/core'

/** How many summaries to fetch per page */
export const EMAIL_PAGE_SIZE = 50

/** How long the search box must settle before we query the server */
const SEARCH_DEBOUNCE_MS = 200

/**
 * The inbox listing: a page at a time, filtered and sorted by the server
 *
 * Every consumer calls this hook and React Query dedupes them onto a single
 * request, so the whole app shares one view of the list.
 */
export function useEmailList() {
  const searchQuery = useUIStore((state) => state.searchQuery)
  const search = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS)

  const query = useInfiniteQuery({
    queryKey: ['emails', 'summary', search],
    queryFn: ({ pageParam }) =>
      api.emails.getSummaries({ skip: pageParam, limit: EMAIL_PAGE_SIZE, search }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.skip + lastPage.items.length
      return loaded < lastPage.total ? loaded : undefined
    },
  })

  const pages = query.data?.pages
  const items: EmailSummary[] = useMemo(
    () => pages?.flatMap((page) => page.items) ?? [],
    [pages]
  )

  // Counts come from the most recent page, so they reflect the latest fetch
  const latest = pages?.[pages.length - 1]

  return {
    ...query,
    /** Summaries loaded so far, newest first */
    items,
    /** Emails matching the current search */
    total: latest?.total ?? 0,
    /** Emails held by the server, ignoring the search */
    storeTotal: latest?.storeTotal ?? 0,
    /** Unread emails held by the server */
    unread: latest?.unread ?? 0,
    /** Whether a search is currently narrowing the list */
    isSearching: search.trim().length > 0,
  }
}

/**
 * Hook to fetch a single email by ID
 */
export function useEmail(id: string | null) {
  return useQuery({
    queryKey: ['email', id],
    queryFn: () => api.emails.getById(id!),
    enabled: !!id,
  })
}

/**
 * Hook to fetch email HTML content
 */
export function useEmailHtml(id: string | null) {
  return useQuery({
    queryKey: ['email', id, 'html'],
    queryFn: () => api.emails.getHtml(id!),
    enabled: !!id,
  })
}

/**
 * Hook to fetch email source
 */
export function useEmailSource(id: string | null) {
  return useQuery({
    queryKey: ['email', id, 'source'],
    queryFn: () => api.emails.getSource(id!),
    enabled: !!id,
  })
}

/**
 * Hook to delete an email
 */
export function useDeleteEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.emails.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
    },
  })
}

/**
 * Hook to delete all emails
 */
export function useDeleteAllEmails() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.emails.deleteAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
    },
  })
}

/**
 * Hook to mark all emails as read
 */
export function useMarkAllRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.emails.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
    },
  })
}

/**
 * Hook to relay an email
 */
export function useRelayEmail() {
  return useMutation({
    mutationFn: ({ id, relayTo }: { id: string; relayTo?: string }) =>
      api.emails.relay(id, relayTo),
  })
}

/**
 * Hook to fetch server config
 */
export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: api.config.get,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to manually refresh emails
 */
export function useRefreshEmails() {
  const queryClient = useQueryClient()
  // useIsFetching is reactive and will trigger re-renders when fetching state changes
  const fetchingCount = useIsFetching({ queryKey: ['emails'] })

  return {
    refresh: () => queryClient.invalidateQueries({ queryKey: ['emails'] }),
    isRefreshing: fetchingCount > 0,
  }
}

