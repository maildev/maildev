import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Email } from '@maildev/core'

/**
 * Hook to fetch all emails
 */
export function useEmails() {
  return useQuery({
    queryKey: ['emails'],
    queryFn: api.emails.getAll,
    refetchInterval: 5000, // Refetch every 5 seconds as fallback
  })
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

  return {
    refresh: () => queryClient.invalidateQueries({ queryKey: ['emails'] }),
    isRefreshing: queryClient.isFetching({ queryKey: ['emails'] }) > 0,
  }
}

/**
 * Filter emails by search query
 */
export function filterEmails(emails: Email[], query: string): Email[] {
  if (!query.trim()) {
    return emails
  }

  const lowerQuery = query.toLowerCase()

  return emails.filter((email) => {
    // Search in subject
    if (email.subject?.toLowerCase().includes(lowerQuery)) {
      return true
    }

    // Search in from addresses
    if (
      email.from?.some(
        (addr) =>
          addr.address?.toLowerCase().includes(lowerQuery) ||
          addr.name?.toLowerCase().includes(lowerQuery)
      )
    ) {
      return true
    }

    // Search in to addresses
    if (
      email.to?.some(
        (addr) =>
          addr.address?.toLowerCase().includes(lowerQuery) ||
          addr.name?.toLowerCase().includes(lowerQuery)
      )
    ) {
      return true
    }

    // Search in text content
    if (email.text?.toLowerCase().includes(lowerQuery)) {
      return true
    }

    return false
  })
}
